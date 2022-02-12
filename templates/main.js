import Vue from 'Vue'

// ----------------------------------------------------- MAIN API CLASS

class APIS {

    constructor(credentials) {
        this.credentials = credentials
    }

    // ----------------- INSTALLER

    install() {
        const apis = this
        vue.mixin({
            beforeCreate() {
                this.$apis = apis
            },
        })
    }


    // ----------------- UTILS

    __get_cookie(key) {

    }

    // ----------------- INNER API CALLERS

    // //// APIS

    // ----------------- EXTERNAL CALLERS

    // //// EXTERNALS
}

// ----------------------------------------------------- VUE INSTALL

const apis = new APIS()
Vue.use(apis)