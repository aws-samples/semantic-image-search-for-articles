#!/usr/bin/env node
import { program } from "commander";
import process from "process";
import chalk from "chalk";
import toml from "toml";
import { promises as fs } from "fs";
import { resolve } from "path";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";

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

async function getCloudFormationOutputs(region, stackName) {
  const cfnClient = new CloudFormationClient({ region: region });
  const describeStacks = new DescribeStacksCommand({ StackName: stackName });
  try {
    const describeStacksResp = await cfnClient.send(describeStacks);
    return describeStacksResp.Stacks[0].Outputs;
  } catch (error){
    console.log(chalk.red(error));
    process.exit(1);
  }
}

async function getFileMap(dir) {
  const files = await getFiles(dir);
  const proms = files.map(async file => {
    const safeFile = file.slice(resolve(dir).length + 1).replace("\\", "/");
    return [file, safeFile]
  });
  return Object.fromEntries(await Promise.all(proms));
}

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return files.flat(1);
}

async function uploadFile(client, bucket, key, file) {
  const fileData = await fs.readFile(file);
  await client.send(new PutObjectCommand({Bucket: bucket, Key: key, Body: fileData, ContentType: mime.getType(file)}));
}

async function run(distFolder, options) {
  if (options.tomlFile) {
    const tomlData = await parseToml(options.tomlFile);
    options.region = tomlData.region;
    options.stackName = tomlData.stackName;
  }
  const s3Client = new S3Client({ region: options.region });
  const outputsRaw = await getCloudFormationOutputs(options.region, options.stackName);
  const outputs = Object.fromEntries(outputsRaw.map((output) => [output.OutputKey, output.OutputValue]));
  const files = await getFileMap(distFolder);
  const uploadProms = Object.keys(files).map(file => uploadFile(s3Client, outputs.S3Bucket, files[file], file));
  await Promise.all(uploadProms);
  console.log(chalk.green(outputs.CloudFrontUrl))
}

program
  .name('host')
  .version('0.1.0')
  .description("Create an Amplify Application to host the web app")
  .argument("[distFolder]", "The path of the dist folder containing the built app.", "./dist")
  .option("-t, --toml-file <value>", "The path to the samconfig toml file.")
  .option("-s, --stack-name <value>", "The name of the CloudFormation Stack.")
  .option("-r, --region <value>", "The AWS region.")
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
