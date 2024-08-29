const ARG_COMMON = {
  '--help': Boolean,
  '-h': '--help',

  '--debug': Boolean,
  '-d': '--debug',

  '--version': Boolean,
  '-v': '--version',

  '--no-color': Boolean,

  '--token': String,
  '-t': '--token',

  '--scope': String,
  '-S': '--scope',

  '--local-config': String,
  '-A': '--local-config',

  '--global-config': String,
  '-Q': '--global-config',

  '--api': String,

  '--cwd': String,

  '--github': Boolean,

  '--google': Boolean,

  '--bitbucket': Boolean,

  '--oob': Boolean,
};

export default ARG_COMMON;
