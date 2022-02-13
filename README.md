# vue-api-generator
Vue Inner API plugin generator
 
## Install

`npm i vue-api-generator`
 
## Generating

Once installed, one can execute the `npm vue-api-generator` in order to generate the plugin api.

A **configuration** file is required in order to give instructions on how to generate the api plugin.

By default, the configuration file will be picked from the working directory file `configuration.json` but it is possible to specify a configuration file path using `npm vue-api-generator <config file path>`

## configuration file

### Specification

- **vue_src_directory** (*string* vue source directory path)
- **apis** (*object* apis config)
    - name (*string* api name, us `""` for direct access) → (*object*)
        - **host** (*string* api main host)
        - **apis?** (*apis* for sub apis, optional)
        - **endpoints?** (*objects* all endpoints, opional)
            - ep_url_pattern (*string*) → (*object*)
                - **url** (*string* uses express pattern)
                - **method?** (*method* REST method, default is `GET`, optional)
                - **credentials?** (*object* credential to use)
                    - **header_type** (*string* see header types)
                    - **token_type** (*string* see token types)
                    - **options** (*credential options*)

### Credentials

The credential object uses a *credential options* key data in order to setup the credential headers for a specific endpoint.

This options object's content depends on the credential header and token types.

#### header types

 - **Bearer** creates an Authorization header `{ Authorization: "Bearer <token>" }`
 - **Custom** creates a custom name header `{ <options.header>: "<token>" }`

#### token types

 - **absolute** creates an Authorization header `{ <cred_header>: this.credentials["<options.cred_key>"] }`\
 You will have to provide a credential file containing the specified credential key `cred_key` while generating the plugin api by specifying the path in the generation command. Bear in mind that these credentials will be imprinted inside the client api thus being accessible by an client. Only client side api token must be delivered through the credentials file.
 - **cookie** uses the client cookie to setup the token `{ <cred_header>: this.__get_cookie("<options.cookie>") }`

### Sub Apis

When a sub api is specified using the `apis` key within an API configuration, all host are concatenated.

The API names will have to be called in chain `this.$api.root_api.sub_api.sub_sub_api ...`.

A root api can be configured to use endpoints has well as sub apis.

### Example

```json
{
    "vue_src_directory": "./src", 
    "apis": { 
        "accounts": { 
            "host": "/api",
            "endpoints": {
                "list":{
                    "url": "",
                    "method": "GET",
                },
                "create":{
                    "url": "/:name",
                    "method": "POST",
                    "data_needed": true
                },
            }
        },
        "facebook": {
            "host":"https://api.facebook.com/api",
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
                                    "token": "facebook"
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
                                    "token": "facebook"
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

`npm exec vue-api-generator[ --config-path="<JSON configuration file path>"][ --creds-path="<JSON configuration file path>"][ --api-name="<api plugin name>"]`

 - **--config-path** to specify the api configuration file (default is "./configuration.json")
 - **--creds-path** to specify a credentials file path (if not set, no credentials are added to the api)
 - **--api-name** to specify the plugin's name (default is "api")

#### Examples

`npm exec vue-api-generator`

`npm exec vue-api-generator --config-path="my_api_config.json"`

`npm exec vue-api-generator --api-name="inner_api"`

`npm exec vue-api-generator --creds-path="client_opened_credentials.json"`

`npm exec vue-api-generator --config-path="my_api_config.json" --creds-path="my_creds.json"`

### JS

Using the configuration file above, one can use the described api inside a vue component using:
```js

methods: {

    // ---- api v3 usage
    async get_company_list() {
        return await this.$api.get_companies()
    },

    async create_company(name, id, nic) {
        const company = {id, name, nic}
        await this.$api.create_company(company)
        this.success_text = `company ${name} created !`
    },
    
    async remove_company(id) {
        const rm_company = await this.$api.remove_company(compidany)
        this.success_text = `company ${rm_company.name} removed !`
    },

    // ---- api v0 usage
    async update_data_list() {
        const list = await this.$api.old_api.list()
        this.$set(this, 'accounts', list)
    },
    async create_account(name, account_data={}) {
        const new_account = await this.$api.old_api.create(name, account_data)
        console.log('new account', name, 'created', new_account)
        this.update_data_list()
    },

    // ---- facebook sub apis example
    async connect_people(people1, people2) {
        const { id: id1 } = people1
        const { id: id2 } = people2
        const created_link = await this.$api.facebook.connection.connect(id1, id2)
    }
}

```
 
## License

Licensed under [MIT](./LICENSE)