// TODO the functions that get called after the various prompts should be refactored into a reusable function
// TODO prompt params should probably be set outside of the prompt call (look at docs)
// TODO dont use set timeout for the deletion of the files obs. make a callback or promise or something
// TODO maybe peek to see if babelrc exists and use that
// TODO add like all the presets normally so we don't error out
// ! research for webpack, etc after prompting for root, and run the 'use their own webpack' function after abstracting it out
// TODO get the recursive dist folder deletion again. otherwise, they could save other shit to our dist folder, which we dont want
// TODO AND THEN GET EXPENSIFY AND MCMI WORKING
// TODO use all bable plugins and presets
// TODO, only the regular build runs when we use env webpack. check on using production and development
// TODO get the scripts we need to use
// TODO make sure temp.js is getting deleted, and potentially change the name
// TODO we find a config file in cra even though it isn't there. fix this
// TODO add mini-css-extract to our config files
// TODO when we create a config, (from their entry and without), we should save that to their local folder so we can just run their entry withour worrying about their node modules or changing their rel to absolute paths and then we can also save it directly there afterward
//?? probably should get the entry point set up for auto find and if not let them enter it
// ?? look into how to handle our creating a webpack if they use an array of chunks for their entry instead of a single file

const fs = require('fs');
const path = require('path');
const prompt = require('prompt');
const cmd = require('node-cmd');
const rimraf = require('rimraf');
const fse = require('fs-extra');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const babel = require('babel-core');

const createWebpackConfig = require('./utils/webpack-template');
const folderIndexer = require('./utils/get-files-from-root.js');
prompt.start();

const distDirPath = path.join(__dirname, '..', 'dist');
// ?? ODD. these files get recrearted by parcel even when i delete them, and i have to add them here for them to delete at all. if i add them later, the code block doesn't run
const foldersToDeleteAfterRunning = [
  path.join(__dirname, '.cache'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, '..', 'dist'),
];
const filesToDeleteAfterRunning = [path.join(__dirname, '..', 'webpack.config.js')];
const deleteTemporaryFilesAndFolders = (files = [], folders = []) => {
  folders.forEach((path, i, arr) => {
    fse.remove(path, (err, res) => {
      if (i === arr.length - 1) console.log('last folder deleted');
    });
  });
  files.forEach((path, i, arr) => {
    fs.unlink(path, (err, res) => {
      if (i === arr.length - 1) console.log('last file deleted');
    });
  });
};

const getFiles = rootDir => {
  return new Promise((resolve, reject) => {
    folderIndexer(rootDir, (err, res) => {
      if (err) reject(err);
      if (res) resolve(res);
    });
  });
};

// dev testing purposes only
const scrumEntry = '../../../../week-5/reactscrumboard/src/index.js'; // $$ (BUILD:PROD)
const scrumRoot = '/Users/bren/Codesmith/week-5/reactscrumboard'; //$$  (env webpack)

const indecisionEntry = '../../../../../React/1-indecisionApp/src/app.js'; //$$ (env webpack)
const indecisionRoot = '/Users/bren/React/1-indecisionApp'; // $$ (env webpack)

const expensifyEntry = '../../../../../React/2-expensify/src/app.js'; //$$ (env webpack)
const expensifyRoot = '/Users/bren/React/2-expensify'; // $$ (env webpack)

const MCMIEntry = '../../../../../MCMI/ReactMCMI/src/components/App.jsx'; // $$ (env webpack)
const MCMIRoot = '/Users/bren/MCMI/ReactMCMI'; // $$ (env webpack)

const FORMIKEntry = '../../../../../React/Formik/src/app.js'; // $$ (env webpack)
const FORMIKRoot = '/Users/bren/React/Formik'; // $$ (env webpack)

const boiler1entry = '../../../../../React/React_Boilerplate-v1/src/app.js'; // $$ (npm run env production)
const boiler1root = '/Users/bren/React/React_Boilerplate-v1'; // $$ (npm run env production)

const boiler2entry = '../../../../../React/React_Boilerplate-v2/src/app.js'; // $$  (env webpack)
const boiler2root = '/Users/bren/React/React_Boilerplate-v2'; // $$  (env webpack)

const cra = '../../../../playground/example-cra/test/src/App.js';
const craRoot = '/Users/bren/Codesmith/zweek-7-PROJECT/playground/example-cra/test/';

const craWithWP = '../../../../playground/cra-bundler-config-comparison/cra-webpack/src/App.js';
const craRootWithWP =
  '/Users/bren/Codesmith/zweek-7-PROJECT/playground/cra-bundler-config-comparison/cra-webpack/';

const createAndSaveWebpackConfig = (
  entryFile,
  extensions,
  outputPath = path.join(__dirname, '..', 'dist'),
  indexHtmlPath = path.join(__dirname, 'template.html'),
  rootDir
) => {
  return new Promise((resolve, reject) => {
    const dynamicWebpackConfig = createWebpackConfig(
      entryFile,
      extensions,
      (outputPath = path.join(__dirname, '..', 'dist')),
      (indexHtmlPath = path.join(__dirname, 'template.html')),
      rootDir
    );
    const webpackConfigSavePath = path.join(__dirname, '..', 'webpack.config.js');
    fs.writeFile(webpackConfigSavePath, dynamicWebpackConfig, (err, res) => {
      if (err) reject(err);
      resolve(webpackConfigSavePath);
    });
  });
};

const getRequiredInfoFromFiles = (files, rootDir) => {
  function packageJSONExistsInDir(fileEntry, rootDir) {
    return fileEntry.name === 'package.json' && fileEntry.fullParentDir === rootDir;
  }
  const webpackConfig = { exists: false, path: null, content: null };
  let valueForWebpackConfigOutput;
  let entryIsInRoot;
  let indexHtmlPath;
  let filePaths = files.reduce((files, fileInfo) => {
    // check if entry file is in root of project
    if (!entryIsInRoot && packageJSONExistsInDir(fileInfo, rootDir)) entryIsInRoot = true;
    const { name, fullPath } = fileInfo;
    // TODO prompt if multiple webpack configs found
    // check for webpack config outside of node modules
    if (
      name === 'webpack.config.js' &&
      !fullPath.includes('/node_modules/') &&
      !webpackConfig.exists
    ) {
      webpackConfig.exists = true;
      (webpackConfig.fullPath = fullPath),
        //might not need some of this stuff anymore. might just need to know if it exists. we'll see
        (webpackConfig.content = fs.readFileSync(fullPath, 'utf-8'));
      webpackConfig.info = fileInfo;
    }
    if (name === 'index.html' && !fullPath.includes('/node_modules/') && !indexHtmlPath)
      indexHtmlPath = fullPath;
    // make sure /src/ is in the root of the project (name should be src/index.js and when you remove src/index.js)
    if (fullPath.includes('/src/index.js') && fullPath.replace('/src/index.js', '') === rootDir)
      valueForWebpackConfigOutput = fullPath;
    return files.concat(name);
  }, []);
  const extensions = files
    .map(file => path.extname(file.name))
    .reduce((acc, ext) => (acc.includes(ext) ? acc : acc.concat(ext)), []);
  return {
    webpackConfig,
    entryIsInRoot,
    indexHtmlPath,
    extensions,
    filePaths,
    valueForWebpackConfigOutput,
  };
};

const parseConfigForOutput = configFileStr => {
  let output;
  const ast = babylon.parse(configFileStr, { sourceType: 'module' });
  traverse(ast, {
    Identifier: {
      enter(path) {
        if (path.node.name === 'entry') {
          let entryValue = withRegularPath.slice(path.parent.value.start, path.parent.value.end);
          eval(`entryValue= ${entryValue}`);
          output = entryValue;
        }
      },
    },
  });
  console.log('output: ', output);
  return output;
};
const indexFilesFromRoot = rootDir => {
  // in case they provide a file, just grab the directory's path. it's possibly using fs stats to test if file or directory is better, but that is a slower, synchronous function. i think this works in all cases
  rootDir = path.extname(rootDir) ? path.dirname(rootDir) : rootDir;
  return new Promise((resolve, reject) => {
    getFiles(rootDir).then(files => {
      let {
        webpackConfig,
        entryIsInRoot,
        indexHtmlPath,
        extensions,
        valueForWebpackConfigOutput,
      } = getRequiredInfoFromFiles(files, rootDir);
      if (!entryIsInRoot) console.log('----------no package.json in provided directory----------'); // TODO prompt them to make sure this is the root folder
      if (webpackConfig.exists)
        valueForWebpackConfigOutput = parseConfigForOutput(webpackConfig.content);
      const response = {
        webpackConfig,
        entryIsInRoot,
        indexHtmlPath,
        extensions,
        rootDir,
        valueForWebpackConfigOutput,
      };
      resolve(response);
    });
  });
};

const runWebpack = requestObject => {
  return new Promise((resolve, reject) => {
    const {
      valueForWebpackConfigOutput,
      extensions,
      indexHtmlPath,
      rootDir,
      createNewConfig,
    } = requestObject;
    if (createNewConfig) {
      console.log('******************************');
      console.log('creating new webpack config...');
      console.log('******************************');

      createAndSaveWebpackConfig(
        valueForWebpackConfigOutput,
        extensions,
        null,
        indexHtmlPath,
        rootDir
      ).then(webpackConfigSavePath => {
        const saveDestinationForStats = path.relative(
          __dirname,
          path.join(__dirname, 'backend', 'stats.json')
        );
        // build the production build
        cmd.get(
          `webpack --config ${webpackConfigSavePath} --mode production --profile --json > ${saveDestinationForStats}`,
          (err, res) => {
            if (err) reject(err);
            console.log(res);
            resolve(requestObject);
          }
        );
      });
    } else {
      console.log('*************************************');
      console.log('running existing webpack.config.js...');
      console.log('*************************************');

      const pathToTheirRoot = path.relative(process.cwd(), rootDir);
      const pathBackFromRoot = path.relative(rootDir, process.cwd());
      const pathToWriteStatsFromTheirRoot = path.relative(
        rootDir,
        path.join(process.cwd(), 'backend', 'stats.json')
      );
      process.chdir(pathToTheirRoot);
      console.log(valueForWebpackConfigOutput);

      cmd.get(
        `npm run env webpack --profile --json > ${pathToWriteStatsFromTheirRoot}`,
        (err, res) => {
          if (err) reject(err);
          console.log(res);
          console.log('production and development builds successful');
          process.chdir(pathBackFromRoot);
          resolve({ indexHtmlPath, valueForWebpackConfigOutput });
        }
      );
    }
  });
};

module.exports = { indexFilesFromRoot, runWebpack };

//         //TODO should search for index.js or app.js, or maybe check their package json
//         // webpack entry defaults to ./src/index.js
//         // ask them for their entry file
//         // const promptMessage = `Is this file your entry point:

//         //     `;
//         const promptMessage = `Please enter your entry file path`;
//         prompt.get(makePrompt(promptMessage), (err, { answer }) => {
//           createAndSaveWebpackConfig(
//             valueForWebpackConfigOutput,
//             extensions,
//             null,
//             indexHtmlPath,
//             rootDir
//           ).then(webpackConfigSavePath => {
//             // build the production build
//             cmd.get(`webpack --config ${webpackConfigSavePath} --mode production`, (err, res) => {
//               if (err) throw new Error(err);
//               console.log(res);
//               // build the development build
//               cmd.get(
//                 `webpack --config ${webpackConfigSavePath} --mode development`,
//                 (err, res) => {
//                   if (err) throw new Error(err);
//                   console.log(res);
//                   console.log('production and development builds successful');
//                   resolve({ indexHtmlPath, valueForWebpackConfigOutput });
//                 }
//               );
//             });
//           });
//         });
//       }
//     })
//     .catch(e => console.log('ERROR: ', e));
// })
//   .then(({ indexHtmlPath, valueForWebpackConfigOutput }) => {
//     const parcelEntryFile = indexHtmlPath || valueForWebpackConfigOutput;
//     console.log(`running parcel build on ${parcelEntryFile}...`);
//     return new Promise((resolve, reject) => {
//       cmd.get(`parcel build ${parcelEntryFile}`, (err, res) => {
//         if (err) reject(err);
//         resolve(res);
//       });
//     });
//   })
//   .then(res => {
//     console.log(res);
//     console.log('deleting temporary files...');
//     deleteTemporaryFilesAndFolders(filesToDeleteAfterRunning, foldersToDeleteAfterRunning);
//   })
//   .catch(e => {
//     console.log('there was an error: ', e);

//     console.log('deleting temporary files...');
//     deleteTemporaryFilesAndFolders(filesToDeleteAfterRunning, foldersToDeleteAfterRunning);
//   });
