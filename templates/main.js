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
        return Object.fromEntries(document.cookie.split('; ').map(cd => cd.split('=')))[key]
    }

    // ----------------- INNER API CALLERS
    /*----callers----*/
    // ----------------- EXTERNAL CALLERS
    /*----externals----*/
}

// ----------------------------------------------------- VUE INSTALL

const apis = new APIS()
Vue.use(apis)