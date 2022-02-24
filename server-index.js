const home_dir = process.cwd()
const configuration_arg = process.argv[2]
const configuration_path = `${home_dir}/${configuration_arg ?? 'configuration.json'}`

require('./server')(configuration_path, true)