# Postman.gov.sg

- [Background](#background)
- [How to install](#how-to-install)
- [Local development](#local-development)
- [Build dependencies](#build-dependencies)
- [More information](#more-information)

## Background

On Postman, we made use of a local node module to share code between `frontend`, `backend` & `worker`. It is similar to how one would install npm modules from npm registry or github, except that the path is pointed to a local folder.

ie: `"postman-templating": "file:../modules/postman-templating"`.

We wanted to find a way to share the templating logic because:

1. Used in frontend, backend & worker.
2. Better consistency, we just have to change the code in one place rather than three.

There are several options that we considered:

- npm install from separate repo (postmangovsg-js-tools?)
- npm pack and copy tarball into respective folders
- Publish to npm registry
- Separate branch (sdk branch)
- Use lerna to manage multi-package repo
- local node module

We decided to use local shared module as the rest of the options are more complicated or requires alot more time & effort to set them up.

## How to install

Any shared module can be installed using `npm install ../modules/postman-templating`.

## Local development

To test the changes you want to make to a module like `postman-templating`:

1. Make changes to the module.
2. Run `npm start build` in `postman-templating`.

`npm start build` will remove & replace the `build` folder in `postman-templating` with the updated change.

## Deploying or building in CI

If there are any new dependencies installed in the local node module, the parent folder's `package-lock.json` needs to be updated. This can be done through deleting the `node_modules` and running `npm install`.

1. Install dependency in `postman-templating`.
2. Run `npm start build` in `postman-templating`.
3. Delete `node_modules` in the parent folder. eg `backend` or `frontend`.
4. Run `npm install` in the parent folder
5. Parent folder's `package-lock.json` should be updated.

## Build dependencies

Any dependencies that are needed to build the local module should be installed as a `dependency` instead of a `dev-dependency` because when we deploy, we will run `npm ci` before building the module. `npm ci` do not install `dev-dependency`, which will cause the build to fail.

## More information

Check out [#436](https://github.com/opengovsg/postmangovsg/pull/436) & [#391](https://github.com/opengovsg/postmangovsg/pull/391)
