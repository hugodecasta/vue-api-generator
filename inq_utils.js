require('colors')

function create_choice(str, choice_map) {
    return new Promise((ok, err) => {
        const inquirer = require('inquirer')
        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: str,
                    choices: Object.keys(choice_map),
                },
            ])
            .then(answers => {
                const choice = choice_map[answers.choice]
                ok(choice)
            })
    })
}

function create_yes_no_question(text, def = true) {
    return new Promise((ok, err) => {
        const inquirer = require('inquirer')
        inquirer
            .prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: text,
                    default: def
                },
            ])
            .then(answers => {
                ok(answers.confirm)
            })
    })
}

function create_question(str) {
    return new Promise((ok, err) => {
        const inquirer = require('inquirer')
        inquirer
            .prompt([
                {
                    type: 'input',
                    name: 'question',
                    message: str,
                },
            ])
            .then(answers => {
                ok(answers.question)
            })
    })
}

function warning() {
    console.log('\n WARN '.bgYellow.black, ...Array.from(arguments).map(arg => (arg + '').yellow))
}

function info() {
    console.log('\n INFO '.bgCyan.black, ...Array.from(arguments).map(arg => (arg + '').cyan))
}

function success() {
    console.log('\n SUCCESS '.bgGreen.white, ...Array.from(arguments).map(arg => (arg + '').green))
}

async function warn_and_proceed() {
    warning(...arguments)
    const proceed = await create_yes_no_question('Still proceed ?', false)
    if (!proceed) process.exit(1)
}

module.exports = {
    create_yes_no_question, create_choice, create_question,
    warning, info, success,
    warn_and_proceed
}