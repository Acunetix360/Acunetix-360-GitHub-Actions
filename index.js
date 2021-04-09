const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const qs = require('qs');

const baseUrl = 'https://www.acunetix360.com';
const createScanRequestEndpoint = '/api/1.0/scans/CreateFromPluginScanRequest';
const scanStatusPath = '/scans/status/';

const scanTypes = {
  EMPTY: '',
  INCREMENTAL: 'Incremental',
  PRIMARY: 'FullWithPrimaryProfile',
  SELECTED: 'FullWithSelectedProfile',
}

const requestType = {
  GET: 'GET',
  POST: 'POST',
}

function isEmpty(str) {
  return (!str || str === '');
}

function getScanType(scanTypeEnum) {
  switch (scanTypeEnum) {
    case scanTypes.INCREMENTAL:
      return scanTypes.INCREMENTAL;
    case scanTypes.PRIMARY:
      return scanTypes.PRIMARY;
    case scanTypes.SELECTED:
      return scanTypes.SELECTED;
    default:
      return scanTypes.EMPTY;
  }
}

function isScanTypeValid(scanType) {
  return (
    scanType === scanTypes.PRIMARY ||
    scanType === scanTypes.INCREMENTAL ||
    scanType === scanTypes.SELECTED
  );
}

function needsProfile(scanType) {
  return (
    scanType === scanTypes.INCREMENTAL ||
    scanType === scanTypes.SELECTED
  );
}

function verifyInputs(websiteIdInput, scanTypeInput, userIdInput, apiTokenInput, scanType, profileIdInput) {

  if (isEmpty(websiteIdInput)) {
    core.setFailed(`Input website-id is empty.`);
    return -1;
  }

  if (isEmpty(userIdInput)) {
    core.setFailed(`Input user-id is empty.`);
    return -1;
  }

  if (isEmpty(apiTokenInput)) {
    core.setFailed(`Input api-token is empty.`);
    return -1;
  }

  if (isEmpty(scanTypeInput)) {
    core.setFailed(`Input scan-type is empty.`);
    return -1;
  }

  if (!isScanTypeValid(scanType)) {
    core.setFailed(`Input scan-type is not valid: ${scanTypeInput}`);
    return -1;
  }

  if (needsProfile(scanType) && isEmpty(profileIdInput)) {
    core.setFailed(`Input profile-id is empty.`);
    return -1;
  }

  return 0;
}

function prepareRequestData(websiteIdInput, scanType, profileIdInput) {
  return qs.stringify({
    'ProfileId': profileIdInput, 'ScanType': scanType, 'WebsiteId': websiteIdInput, "VcsCommitInfoModel": {
      "CiBuildConfigurationName": `${process.env.GITHUB_REPOSITORY}`, "CiBuildHasChange": `${process.env.GITHUB_SHA}`, "CiBuildId": `${process.env.GITHUB_RUN_NUMBER}`,
      "CiBuildUrl": `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`, "Committer": `${process.env.GITHUB_ACTOR}`,
      "IntegrationSystem": "GithubActions", "VcsName": "Git", "VcsVersion": `${process.env.GITHUB_SHA}`
    }
  });
}

function scanRequest() {
  try {
    const websiteIdInput = core.getInput('website-id');
    const scanTypeInput = core.getInput('scan-type');
    const profileIdInput = core.getInput('profile-id');
    const userIdInput = core.getInput('user-id');
    const apiTokenInput = core.getInput('api-token');

    let baseUrlnput = core.getInput('base-url');
    if (isEmpty(baseUrlnput)) {
      baseUrlnput = baseUrl;
    }
    const scanStatusBaseUrl = baseUrlnput + scanStatusPath;
    const scanRequestEndpoint = baseUrlnput + createScanRequestEndpoint;

    const scanType = getScanType(scanTypeInput);

    if (verifyInputs(websiteIdInput, scanTypeInput, userIdInput, apiTokenInput, scanType, profileIdInput) === -1) {
      return -99;
    }

    var requestData = prepareRequestData(websiteIdInput, scanType, profileIdInput);

    var config = {
      method: requestType.POST,
      url: scanRequestEndpoint,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${userIdInput}:${apiTokenInput}`).toString('base64')}` },
      data: requestData
    };

    core.info("Requesting scan...");
    axios(config).then(function (response) {
      core.info("Scan request succeeded.");
      try {
        var result = JSON.parse(JSON.stringify(response.data));
      } catch (error) {
        core.error("Error parsing JSON %s", error.message);
        throw error;
      }

      if (result.IsValid) {
        core.setOutput('scan-message', `Scan details are available at ${String(scanStatusBaseUrl + result.ScanTaskId)}`);
      } else {
        throw result;
      }

    }).catch(function (error) {
      if(error.response === undefined){
        core.setFailed(`Error: ${error.syscall} ${error.code}  Hostname: ${error.hostname}`);
        return -2
      }else if (error.response.data != null && !error.response.data.IsValid) {
        if (isEmpty(error.response.data.ErrorMessage)) {
          core.setFailed(`Scan could not be created. Check error: ${error.response.data}`);
        } else {
          core.setFailed(`Scan could not be created. Check error message: ${error.response.data.ErrorMessage}`);
        }
        return -3;
      }
      core.setFailed(`Error: ${error}`);
      return -4;
    });
  } catch (error) {
    core.setFailed(error.message);
    return -5;
  }
}

// MAIN
scanRequest();
