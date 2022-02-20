# vue-api-generator 
Vue Inner API plugin generator
 
## Install

#### install local
`npm i vue-api-generator --save-dev`

#### install global
`npm i -g vue-api-generator`
 
## Generating

Once installed, one can execute the `npm vue-api-generator` in order to generate the plugin api.

A **configuration** file is required in order to give instructions on how to generate the api plugin.

By default, the configuration file will be picked from the working directory file `configuration.json` but it is possible to specify a configuration file path using `npm vue-api-generator <config file path>`

## configuration file

### Specification

- **name?** (*string* api name, default is `api`, optional)
- **credentials_path?** (*string* credential json file path, optional)
- **vue_src_directory?** (*string* vue source directory path, default is `./src`, optional)
- **apis** (*object* apis config)
    - name (*string* api name, us `""` for direct access) → (*object*)
        - **host** (*string* api main host)
        - **apis?** (*apis* for sub apis, optional)
        - **endpoints?** (*objects* all endpoints, opional)
            - ep_url_pattern (*string*) → (*object*)
                - **url** (*string* uses express pattern)
                - **method?** (*string* REST method, default is `GET`, optional)
                - **default?** (*string* default value for all url arguments, optional)
                - **defaults?** (*object* default values specified for each url argument, overrides the `default` value if set)
                    - arg_name (*string*) → (*string* default value)
                - **data_needed?** (*boolean* whether a data body is needed or not, optional)
                - **data_format?** (*string* if data is needed, specify the data foramat, default is `json`, optional)
                - **credentials?** (*object* credential to use)
                    - **header_type** (*string* see header types)
                    - **token_type** (*string* see token types)
                    - **options** (*credential options*)

### Credentials

The main credential file containing all credentials data must be specified in the root key `credentials_path`. Leave this key blank or unexistent if you have no credentials to be imprinted inside the api plugin.

The credential endpoint object uses a *credential options* key data in order to setup the credential headers for a specific endpoint.

This options object's content depends on the credential header and token types.

#### header types

 - **Bearer** creates an Authorization header `{ Authorization: "Bearer <token>" }`
 - **Custom** creates a custom name header `{ <options.header>: "<token>" }`

#### token types

 - **absolute** creates an Authorization header `{ <cred_header>: this.credentials["<options.cred_key>"] }`\
 You will have to provide a credential file path containing the specified credential key `cred_key` in the configuration file. Bear in mind that these credentials will be imprinted inside the client api thus being accessible by an client. Only client side api tokens must be delivered through the credentials file.
 - **cookie** uses the client cookie to setup the token `{ <cred_header>: this.__get_cookie("<options.cookie>") }`
 - **session** uses the client sessionStrage to setup the token `{ <cred_header>: sessionStorage("<options.cookie>") }`
 - **local** uses the client localStorage to setup the token `{ <cred_header>: localStorage("<options.cookie>") }`
 - **local_session** uses the client localStorage or sessionStorage to setup the token `{ <cred_header>: (localStorage("<options.cookie>") ?? sessionStorage("<options.cookie>")) }`

### Sub Apis

When a sub api is specified using the `apis` key within an API configuration, all host are concatenated.

The API names will have to be called in chain `this.$api.root_api.sub_api.sub_sub_api ...`.

A root api can be configured to use endpoints has well as sub apis.

### Environnement Variables

One can ask the api generator to imprint a given variable environnement (eather from at serve time or at build time) by specifying the varenv name preceded by to `ENV:` keyword.\
For example, if one need to use a custome host specified by an environnement variable, the configuration looks like this `host: "https://ENV:MAIN_HOST/apis"`.

Many `ENV:...` instructions can be used in a single string.

The `ENV:...` instruction can be use in any given string (except in keys from the configuration file).

### Example

```json
{
    "name": "my_api",
    "credentials_path": "./my_creds.json",
    "vue_src_directory": "./src",
    "apis": {
        "accounts": {
            "host": "/api",
            "endpoints": {
                "list": {
                    "url": "",
                    "method": "GET"
                },
                "create": {
                    "url": "/:name",
                    "method": "POST",
                    "data_needed": true
                }
            }
        },
        "facebook": {
            "host": "https://api.facebook.com/api",
            "apis": {
                "people": {
                    "host": "people/v1",
                    "endpoints": {
                        "get": {
                            "url": ":name",
                            "method": "GET",
                            "credentials": {
                                "header_type": "Bearer",
                                "token_type": "absolute",
                                "options": {
                                    "cred_key": "facebook"
                                }
                            }
                        }
                    }
                },
                "connection": {
                    "host": "peopleConnect/V3",
                    "endpoints": {
                        "get": {
                            "url": ":id1/:id2",
                            "method": "GET",
                            "credentials": {
                                "header_type": "Bearer",
                                "token_type": "absolute",
                                "options": {
                                    "cred_key": "facebook"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
```
 
## Usage

### Commands

#### Documentation

`npm exec vue-api-generator[ <JSON configuration file path>]`

 - **JSON configuration file path** to specify the api configuration file (default is "./configuration.json")

#### Examples

`npm exec vue-api-generator`

`npm exec vue-api-generator "my_api_config.json"`

`npm exec vue-api-generator "./configs/my_api_config.json"`

`npm exec vue-api-generator "/home/devs/my_project/my_api_config.json"`

### JS

Using the configuration file above, one can use the described api inside a vue component using:
```js

methods: {

    // ---- api v3 usage
    async get_company_list() {
        return await this.$my_api.get_companies()
    },

    async create_company(name, id, nic) {
        const company = {id, name, nic}
        await this.$my_api.create_company(company)
        this.success_text = `company ${name} created !`
    },
    
    async remove_company(id) {
        const rm_company = await this.$my_api.remove_company(compidany)
        this.success_text = `company ${rm_company.name} removed !`
    },

    // ---- api v0 usage
    async update_data_list() {
        const list = await this.$my_api.old_api.list()
        this.$set(this, 'accounts', list)
    },
    async create_account(name, account_data={}) {
        const new_account = await this.$my_api.old_api.create(name, account_data)
        console.log('new account', name, 'created', new_account)
        this.update_data_list()
    },

    // ---- facebook sub apis example
    async connect_people(people1, people2) {
        const { id: id1 } = people1
        const { id: id2 } = people2
        const created_link = await this.$my_api.facebook.connection.connect(id1, id2)
    }
}

```
 
## License

Licensed under [MIT](./LICENSE)