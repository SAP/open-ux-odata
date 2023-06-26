# Version Overrides
This document lists the version overrides for vulnerable (nested) dependencies and the reason.

## semver
| Override:           | >=7.5.2 |
|:--------------------| :-------------|
|                     | |
| **moderate**        | Regular Expression Denial of Service in semver  |
| Package             | semver |
| Vulnerable versions | <7.5.2 |
| Patched versions    | >=7.5.2 |
| More info           | https://github.com/advisories/GHSA-c2qf-rxjj-qqgw  |

## http-cache-semantics
| Override:           | >=4.1.1 |
|:--------------------| :-------------|
|                     | |
| **high**            | Regular Expression Denial of Service in http-cache-semantics  |
| Package             | trim |
| Vulnerable versions | <4.1.1 |
| Patched versions    | >=4.1.1 |
| More info           | https://github.com/advisories/GHSA-rc47-6667-2j5j  |

## json5
| Override:           | >=1.0.2 |
|:--------------------| :-------------|
|                     | |
| **high**            | Prototype Pollution in JSON5 via Parse Method |
| Package             | json5 |
| Vulnerable versions | <1.0.2, >= 2.0.0, < 2.2.2 |
| Patched versions    | 1.0.2, >=2.2.2 |
| More info           | https://github.com/advisories/GHSA-9c47-m6qq-7p4h   |

:warning: Attention :warning: 
* `semver` is used by too many modules. Override can be removed or kept for specific dependencies after we have cleaned up our devDependencies.