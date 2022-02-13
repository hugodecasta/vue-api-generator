import Vue from 'vue'

// ----------------------------------------------------- MAIN API CLASS

class APIS {

    constructor() {
        this.credentials = /*----credentials----*/
    }

    // ----------------- INSTALLER

    install() {
        const apis = this
        Vue.mixin({
            beforeCreate() {
                this.$api = apis
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