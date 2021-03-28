require('dotenv').config()

const chalk = require('chalk')
const path = require('path')
const fs = require('fs')

function versionVerifier() {
  return versionControl(false)
}

function upgradeVersion() {
  return versionControl(true)
}

function versionControl(upgradeVersion) {
  // Get actual config
  const configMeta = getConfigMeta(false) // true for version history

  // check if file exists
  if (!fs.existsSync(configMeta.configFileAbs)) {
    console.log('🔥 ', chalk.underline.red(`Failed Version Verification! Please first create:`), chalk.bgWhite.black(`  ${configMeta.configFile}  `),  chalk(` in `), chalk.bgWhite.grey(` ${configMeta.configFileAbs}`))
    process.exit(1)
  }

  // check first to ensure file exists
  const config = require(configMeta.configFileAbs)

  // Get config history
  const configHistoryMeta = getConfigMeta(true) // true for version history

  // Check if version is found
  if (configHistoryMeta.versioningFound) {
    // Version history exists, check for current version > version deploy
    const configHistory = require(configHistoryMeta.configFileAbs)

    if (configHistory.deploy.history.version >= config.deploy.network[`${hre.network.name}`].version) {
      console.log('🔥 ', chalk.underline.red(`Failed Version Verification! Version of `), chalk.bgWhite.black(`  ${configHistoryMeta.configFileRel}  `),  chalk(` version: `), chalk.red(`${configHistory.deploy.history.version}`), chalk(` vs source file version: `), chalk.green(`${config.deploy.network[`${hre.network.name}`].version}`))
      console.log('🔥 ', chalk.underline.red(`Please upgrade args and version of `), chalk.bgWhite.black(`  ${configMeta.configFileRel}  `),  chalk(` to continue! \n`))
      process.exit(1)
    }
  }

  // so far so good, check if upgradeVersion flag is there, if so, overwrite the file with config
  if (upgradeVersion) {
    let json = {}
    json.args = config.deploy.args
    json.history = config.deploy.network[`${hre.network.name}`]

    const content = `const deploy = ${JSON.stringify(json)}\n\nexports.deploy = deploy`

    fs.writeFileSync(configHistoryMeta.configFileAbs, content)
    // fs.copyFileSync(configMeta.configFileAbs, configHistoryMeta.configFileAbs)
    console.log(chalk.grey(` Upgraded Version to `),  chalk.green.bold(` ${config.deploy.network[`${hre.network.name}`].version}`), chalk(`for`), chalk.green.bold(`${hre.network.name}\n`))
  }


  return config
}

// private
function getConfigMeta(forVersionHistory) {
  let configMeta = {}

  const absPath = _getCallerFile()
  const deployFile = path.basename(absPath)
  const configFile = forVersionHistory ? deployFile.slice(0, -3) + ".version.js" : deployFile.slice(0, -3) + ".config.js"

  let versioningFilePath = ''
  if (forVersionHistory) {
    const deploymentPath = path.join(process.env.FS_ARTIFCATS, process.env.FS_VERSIONING_INFO)
    const networkPath = path.join(deploymentPath, hre.network.name)
    versioningFilePath = path.join(networkPath, configFile)

    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath)
    }

    if (!fs.existsSync(networkPath)) {
      fs.mkdirSync(networkPath)
    }

    if (fs.existsSync(versioningFilePath)) {
      configMeta.versioningFound = true
    }
  }

  const configFileRel = forVersionHistory ? `../${versioningFilePath}` : `../scripts/versioncontrol/${configFile}`

  configMeta.deployFile = deployFile
  configMeta.configFile = configFile
  configMeta.configFileRel = configFileRel
  configMeta.configFileAbs = `${__dirname}/${configFileRel}`

  return configMeta
}

function _getCallerFile() {
    try {
        var err = new Error();
        var callerfile;
        var currentfile;

        Error.prepareStackTrace = function (err, stack) { return stack; };

        currentfile = err.stack.shift().getFileName();

        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();

            if(currentfile !== callerfile) return callerfile;
        }
    } catch (err) {}
    return undefined;
}

module.exports = {
  versionVerifier: versionVerifier,
  upgradeVersion: upgradeVersion
}
