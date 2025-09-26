# @sap-ux/fe-mockserver-admin

Admin service package for the SAP Fiori mockserver that provides an OData service to list currently running services.

## Overview

This package provides an admin OData service that exposes information about currently registered services in a running mockserver instance. It allows you to query which services are active, their configuration, and status.

## Installation

```bash
npm install @sap-ux/fe-mockserver-admin
```

## Usage

You need to define the admin in the `plugins` section of the mockerver

```yaml
  configuration:
      plugins:
        - "@sap-ux/fe-mockserver-admin"
```


## Example

Access the admin service at `http://localhost:3000/admin/Services` to get a list of all registered services in OData JSON format.

## Binary for Mock Data Generation

This package also provides a CLI binary `fe-mockserver-admin` to generate TypeScript mock data files from OData metadata:

### Generate Entity Files

```bash
# Generate entity files from metadata.xml
fe-mockserver-admin generate-entity-files -m path/to/metadata.xml

# Generate entity files with custom output directory
fe-mockserver-admin generate-entity-files -m path/to/metadata.xml -o path/to/output/directory
```

This command will:
- Parse the OData metadata file
- Generate TypeScript entity files for each entity set
- Create an EntityContainer file for action handling
- Generate proper TypeScript interfaces and types

The generated files can be used as mock data contributors in your SAP Fiori mockserver setup.

## License

Apache-2.0