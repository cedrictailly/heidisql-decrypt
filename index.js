
const fs        = require('fs');
const path      = require('path');
const commander = require('commander');
const cliSelect = require('cli-select');
const chalk     = require('chalk');

const nestedSet = (object, parts, value) =>
{
  if ( !parts )
    return;

  parts = parts.split(/[\\\.]/);

  const last = parts.pop();

  parts.forEach(part => object = object[part] ?? (object[part] = {}));

  object[last] = value;
};

const load = filename =>
{
  const lines  = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
  const result = {};

  lines.forEach(line =>
  {
    if ( !line )
      return;

    let [location, type, value] = line.split(/<\|\|\|>/);

    switch ( type )
    {
    case '1':
      break;

    case '3':
      value = parseInt(value);
      break;

    default:
      // console.log(line);
      break;
    }

    nestedSet(result, location, value);
  });

  return result;
}

const decode = hex =>
{
  let result = '';
  let shift  = parseInt(hex.substr(-1));

  hex = hex.substr(0, hex.length - 1);

  for ( let i = 0; i < hex.length; i += 2 )
    result += String.fromCharCode(parseInt(hex.substr(i, 2), 16) - shift);

  return result;
}

const header = chalk.white.bold([
  '',
  ' /$$   /$$           /$$       /$$ /$$  /$$$$$$   /$$$$$$  /$$      ',
  '| $$  | $$          |__/      | $$|__/ /$$__  $$ /$$__  $$| $$      ',
  '| $$  | $$  /$$$$$$  /$$  /$$$$$$$ /$$| $$  \\__/| $$  \\ $$| $$      ',
  '| $$$$$$$$ /$$__  $$| $$ /$$__  $$| $$|  $$$$$$ | $$  | $$| $$      ',
  '| $$__  $$| $$$$$$$$| $$| $$  | $$| $$ \\____  $$| $$  | $$| $$      ',
  '| $$  | $$| $$_____/| $$| $$  | $$| $$ /$$  \\ $$| $$/$$ $$| $$      ',
  '| $$  | $$|  $$$$$$$| $$|  $$$$$$$| $$|  $$$$$$/|  $$$$$$/| $$$$$$$$',
  '|__/  |__/ \\_______/|__/ \\_______/|__/ \\______/  \\____ $$$|________/',
  '                                                      \\__/          ',
  'Cédric Tailly, MIT Licence',
  '',
].join('\n'));

const program = new commander.Command('heidisql-decrypt [file]');

program.version('1.0.0').name('heidisql-decrypt');

program.addHelpText('beforeAll', header);

program.description('Parse HeidiSQL portable_settings.txt file and decrypt passwords.');

program.argument('[filename]');

program.action(async (filename, options, command) =>
{
  if ( !filename )
    filename = 'portable_settings.txt';

  if ( fs.existsSync(filename) && fs.statSync(filename).isDirectory() )
    filename = path.normalize(filename + '/portable_settings.txt');

  console.log(header);

  try {
    var settings = load(filename);
    var servers  = Object.keys(settings['Servers']);
  } catch (error) {
    console.error('Error parsing file : ' + filename);
    process.exit(1);
  }

  const response = await cliSelect({
    values: servers,
    selected: chalk.yellow.bold(' ❱'),
    unselected: '  ',
    valueRenderer: (value, selected) => selected ? chalk.yellow.bold(value) : value
  });

  let server = settings.Servers[servers[response.id]];

  if ( server.com )
    server = server.com;

  // console.log(server);

  let report = {
    Host      : server.Host,
    Port      : server.Port,
    Databases : server.Databases,
    lastUsedDB: server.lastUsedDB,
    User      : server.User,
    Password  : decode(server.Password),
  }

  if ( server.SSHtunnelPrivateKey )
    ['SSHtunnelHost',
     'SSHtunnelHostPort',
     'SSHtunnelUser',
     'SSHtunnelPrivateKey',
     'SSHtunnelPort'].forEach(name => { if ( server[name] !== undefined ) report[name] = server[name]; })

  console.table(report);
});

try {
  program.parse(process.argv);
} catch ( error ){
  console.error(error);
  process.exit(1);
}
