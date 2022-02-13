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

module.exports = {
    create_yes_no_question,
    create_choice,
    create_question,
}