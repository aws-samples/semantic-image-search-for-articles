#!/usr/bin/env node
import { program } from "commander";
import process from "process";
import chalk from "chalk";
import toml from "toml";
import { promises as fs } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import axios from "axios";
import {
  AmplifyClient,
  ListAppsCommand,
  DeleteAppCommand,
  CreateAppCommand,
  CreateBranchCommand,
  CreateDeploymentCommand,
  StartDeploymentCommand,
  GetJobCommand,
} from "@aws-sdk/client-amplify";

async function parseToml(tomlPath) {
  const tomlData = await readToml(tomlPath);
  try {
    return {
      region: tomlData.default.deploy.parameters.region,
      stackName: tomlData.default.deploy.parameters.stack_name
    };
  } catch {
    console.log(chalk.yellow("Unable to find Stack Name and/or Region in specified toml."))
    console.log("Expecting to find properties with names:", chalk.yellow("stack_name"), "and", chalk.yellow("region"), "in the", chalk.yellow("[default.deploy.parameters]"), "section of the toml file.")
    console.log("Ensure the toml file specified has these properties. Alternatively specify these values directly as arguments instead of the toml file path.")
    process.exit(1);
  }
}

async function readToml(tomlPath) {
  try {
    const tomlRaw = await fs.readFile(tomlPath, "utf-8");
    const tomlData = toml.parse(tomlRaw);
    return tomlData;
  } catch (error) {
    if (error.name == "Error" && error.code == "ENOENT") {
      console.log(chalk.red(error.message));
    } else if (error.name == "SyntaxError") {
      console.log(chalk.red("Unable to parse specified toml file"));
    } else {
      console.log(chalk.red(error));
    }
    process.exit(1);
  }
}

async function getFileMap(dir) {
  const files = await getFiles(dir);
  const proms = files.map(async file => {
    const buff = await fs.readFile(file);
    const hash = createHash("md5").update(buff).digest("hex");
    const safeFile = file.slice(resolve(dir).length + 1).replace("\\", "/");
    return [safeFile, hash]
  });
  return Object.fromEntries(await Promise.all(proms));
}

async function deleteApp(client, stackName) {
  const appId = await getAppId(client, stackName);
  const deleteAppCommand = new DeleteAppCommand({ appId: appId });
  await client.send(deleteAppCommand);
  console.log(`Deleted Amplify Application: ${stackName}`);
}

async function getAppId(client, stackName) {
  let listAppsCommand = new ListAppsCommand({});
  let listAppsRes = await client.send(listAppsCommand);
  const app = listAppsRes.apps.find(p => p.name === stackName);
  if (app) {
    console.log(`Amplify Application Id: ${app.appId}`);
    return app.appId;
  } else {
    // Handle pagination
    while (listAppsRes.nextToken) {
      listAppsCommand = new ListAppsCommand({
        nextToken: listAppsRes.nextToken,
      });
      listAppsRes = await client.send(listAppsCommand);
      const app = listAppsRes.apps.find(p => p.name === stackName);
      /* istanbul ignore else */
      if (app) {
        console.log(`Amplify Application Id: ${app.appId}`);
        return app.appId;
      }
    }
    throw new Error(`No App with name "${stackName}" was found.`);
  }
}

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return files.flat(1);
}

async function createApp(client, stackName) {
  const createAppCommand = new CreateAppCommand({ name: stackName, platform: "WEB" });
  const response = await client.send(createAppCommand);
  console.log(`Created Amplify Application: ${stackName}`);
  return response.app;
}

async function createBranch(client, appId) {
  const createBranchCommand = new CreateBranchCommand({ appId: appId, branchName: "npm", stage: "PRODUCTION" });
  const response = await client.send(createBranchCommand);
  console.log(`Created Amplify Application branch: ${response.branch.branchName}`);
  return response.branch.branchName;
}

async function createDeployment(client, appId, branchName, fileMap) {
  const createDeploymentCommand = new CreateDeploymentCommand({ appId: appId, branchName: branchName, fileMap: fileMap });
  const response = await client.send(createDeploymentCommand);
  return response;
}

async function uploadFile(dir, file, url) {
  const fileData = await fs.readFile(resolve(dir, file));
  await axios.put(url, fileData, {
    headers: { "Content-Type": "application/octet-stream" }
  });
  console.log(`Uploaded file: ${file}`);
}

async function startDeployment(client, appId, branchName, jobId) {
  const startDeploymentCommand = new StartDeploymentCommand({ appId: appId, branchName: branchName, jobId: jobId });
  const response = await client.send(startDeploymentCommand);
  console.log("Started deployment..");
  return response;
}

async function run(distFolder, options) {
  if (options.tomlFile) {
    const tomlData = await parseToml(options.tomlFile);
    options.region = tomlData.region;
    options.stackName = tomlData.stackName;
  }
  const ampClient = new AmplifyClient({ region: options.region });
  if (options.unHost) {
    await deleteApp(ampClient, options.stackName);
  } else {
    const app = await createApp(ampClient, options.stackName);
    const branchName = await createBranch(ampClient, app.appId);
    let deployment = await createDeployment(ampClient, app.appId, branchName, await getFileMap(distFolder));
    const jobId = deployment.jobId;
    const uploadProms = Object.keys(deployment.fileUploadUrls).map(file => uploadFile(distFolder, file, deployment.fileUploadUrls[file]));
    await Promise.all(uploadProms);
    deployment = await startDeployment(ampClient, app.appId, branchName, jobId)
    deployment = { job: { summary: { status: deployment.jobSummary.status } } };
    while (deployment.job.summary.status != "SUCCEED" && deployment.job.summary.status != "FAILED") {
      console.log(`Deployment: ${deployment.job.summary.status}`);
      await new Promise(r => setTimeout(r, 2000));
      deployment = await ampClient.send(new GetJobCommand({ appId: app.appId, branchName: branchName, jobId: jobId }));
    }
    console.log(`Deployment: ${deployment.job.summary.status}`);
    console.log(chalk.green(`https://${branchName}.${app.defaultDomain}`))
  }
}

program
  .name('host')
  .version('0.1.0')
  .description("Create an Amplify Application to host the web app")
  .argument("[distFolder]", "The path of the dist folder containing the built app.", "./dist")
  .option("-t, --toml-file <value>", "The path to the samconfig toml file.")
  .option("-s, --stack-name <value>", "The name of the CloudFormation Stack.")
  .option("-r, --region <value>", "The AWS region.")
  .option("-u, --un-host", "Delete the Amplify Application.", false)
  .action((distFolder, options) => {
    if (!options.tomlFile && !options.stackName && !options.region) {
      console.log(chalk.yellow("Please specify a toml file or a stack name and region"))
      process.exit(1);
    } else if (!options.tomlFile && !(options.stackName && options.region)) {
      console.log(chalk.yellow("Please supply a stack name and region."))
      process.exit(1);
    } else if (options.tomlFile && (options.stackName || options.region)) {
      console.log(chalk.yellow("Please supply either a toml file or a stack name and region, not both."))
      process.exit(1);
    }
    run(distFolder, options);
  });
program.parse();
