
# Open UX OData

[![Build status](https://github.com/SAP/open-ux-odata/actions/workflows/pipeline.yml/badge.svg?branch=main)](https://github.com/SAP/open-ux-odata/actions/workflows/pipeline.yml?query=branch%3Amain)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=SAP_open-ux-odata&metric=bugs)](https://sonarcloud.io/summary/new_code?id=SAP_open-ux-odata)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=SAP_open-ux-odata&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=SAP_open-ux-odata)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=SAP_open-ux-odata&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=SAP_open-ux-odata)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=SAP_open-ux-odata&metric=coverage)](https://sonarcloud.io/summary/new_code?id=SAP_open-ux-odata)
[![REUSE status](https://api.reuse.software/badge/github.com/SAP/open-ux-odata)](https://api.reuse.software/info/github.com/SAP/open-ux-odata)

This repository contains a collection of utilities around the OData protocol that can be used in your application.


## Modules

- [@sap-ux/vocabularies-types](./packages/vocabularies-types) : An opinionated set of types representing the OData vocabularies.
- [@sap-ux/edmx-parser](./packages/edmx-parser) : A simple parser of OData metadata document (v2 and v4) that generates an object representation.
- [@sap-ux/annotation-converter](./packages/annotation-converter) : A tool that allows to provide a convenient API on top of the metadata and annotations.

- [@sap-ux/fe-mockserver-core](./packages/fe-mockserver-core) : The core middleware for the mockserver.
- [@sap-ux/fe-mockserver-plugin-cds](./packages/fe-mockserver-plugin-cds) : A CDS plugin to automatically convert CDS file and use them in the mockserver.
- [@sap-ux/ui5-middleware-fe-mockserver](./packages/ui5-middleware-fe-mockserver) : The ui5 middleware for mockserver works out of the box for the ui5 tooling.

## Documentation

Generally documentation will be available in [docs](./docs)
You can also find some samples about the mockserver usage in the [samples folder](./samples/).


## Requirements
Everything is released as node modules requiring node with a version matching `">= 14.16.0 < 15.0.0 || >=16.1.0 < 17.0.0 || >=18.0.0 < 19.0.0`.

## Contributing
Please check the [Development Conventions and Guidelines](./docs/Guidelines.md) document and the [Development Setup](#development-setup) section in this document.

## Development Setup

### Install `pnpm` globally

To install `pnpm` globally using `npm`, run the following:
```shell
npm install -g pnpm
```

More information on pnpm installation options can be found [here](https://pnpm.io/installation).
### Install dependencies
To install `dependencies` and `devDependencies`, run following command at root of the repository:

```shell
pnpm install
```
### Build packages

To transpile the packages, run the following command at the root of the repository or in the individual package:

```shell
pnpm build
```

### Format sources using `prettier`

To format sources, run the following command at the root of the repository or in the individual package:

```shell
pnpm format
```

### Run linting of sources using `eslint`

To run linting of sources, run the following command at the root of the repository or in the individual package:

```shell
pnpm lint
```

To fix linting errors that can be fixed automatically, run the following command at the root of the repository or in the individual package:

```shell
pnpm lint:fix
```

### Run unit tests in packages

To run unit tests using `jest`, run the following command at the root of the repository or in the individual package:

```shell
pnpm test
```
**Note**: if the test run fails due to dependency issues, run `pnpm install && pnpm build` in the root of the repository again to make sure all projects are up-to-date.

### Debug packages
When analyzing a problem, it is helpful to be able to debug the modules. How to debug them depends on the IDE you are using. In this section, it is described how you could debug with VSCode.

Each of the packages has an extensive set of unit tests covering as many as possible different scenarios, therefore, as a starting point for debugging, it is a good idea to use the tests. The easiest (but not the only) way to debug a specific test in VSCode is to open a `JavaScript Debug Terminal` and then go to the package that needs to be debugged. Using the debug terminal, execute all tests with `pnpm test` or a specific one, e.g. execute `pnpm test -- test/basic.test.ts` in the `my-awesome-module` directory (`./packages/my-awesome-module`). When running either of the commands in the debug terminal, breakpoints set in VSCode will be active.


### Create changesets for feature or bug fix branches

A [changeset](https://github.com/atlassian/changesets) workflow has been setup to version and publish packages to npmjs.com. To create changesets in a feature or bug fix branch, run one of the following commands:

```shell
pnpm cset
```

```shell
pnpm changeset
```

This command brings up an [inquirer.js](https://github.com/SBoudrias/Inquirer.js/) style command line interface with prompts to capture changed packages, bump versions (patch, minor or major) and a message to be included in the changelog files. The changeset configuration files in the `.changeset` folder at the root need to be committed and pushed to the branch. These files will be used in the GitHub Actions workflow to bump versions and publish the packages.

The general recommendation is to run this changeset command after a feature or bug fix is completed and before creating a pull request.

A GitHub bot [changeset-bot](https://github.com/apps/changeset-bot) has been enabled that adds a comment to pull requests with changeset information from the branch and includes a warning when no changesets are found.

### Publish to npmjs.com

All modules are published under the `@sap-ux` scope. Publishing packages to npmjs.com is done on every merge commit made to the `main` branch. This is done in two steps in the GitHub Actions workflow:

1. The version job bumps versions of all packages for which changes are detected in the changeset configuration files and also updates changelog files. This job is run when a pull request branch is merged to the main branch and basically runs `changeset version` and commits and pushes the changes made to the `package.json`, changelog, and pnpm lock files.

2. The release job is configured to run after the version merge commit has been pushed to the main branch in the version job. This job publishes the changed packages to npmjs.com

## Code of Conduct
Everyone participating in this joint project is welcome as long as our [Code of Conduct](./docs/CODE_OF_CONDUCT.md) is being adhered to.

## Licensing

Copyright (2021) SAP SE and `open-ux-odata` contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-odata).
