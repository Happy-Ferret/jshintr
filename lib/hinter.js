var jshint = require('./jshint.js').JSHINT;

module.exports = (function () {  
  var jshintHeaderRegex = /\/\*jshint (.+?)\*\//m,
      booleanOptions = 'adsafe asi bitwise boss browser cap couch css curly debug devel eqeqeq es5 evil forin fragment immed jquery laxbreak loopfunc newcap noarg node noempty nonew nomen on onevar passfail plusplus regexp rhino undef safe windows strict sub white widget'.split(' ');

  function correctGlobalsConfig(config) {
    // Correct false's in globals to nulls (bug in jshint?)
    Object.keys(config.jshint.globals).forEach(function (varName) {
      if (!config.jshint.globals[varName]) {
        config.jshint.globals[varName] = null;
      }
    });
  }
  
  function extend(t, o) {
    var n;
    for (n in o) {
      if (o.hasOwnProperty(n)) {
        t[n] = o[n];
      }
    }
    return t;
  }
  
  function getHeaderRegex(type) {
    return getHeaderRegex[type] ? getHeaderRegex[type] : (getHeaderRegex[type] = new RegExp('\\/\\*' + type + ' (.+?)\\*\\/', 'm'));
  }
      
  function getHeader(source, type) {
    var header = source.match(getHeaderRegex(type)),
        options = {};
        
    if (!header) {
      return false;
    }
  
    header[1].trim().split(',').forEach(function (chunk) {
      var bits = chunk.split(':').map(function (bit) {
        return bit.trim();
      });
  
      if (type !== 'jshint' || booleanOptions.indexOf(bits[0]) !== -1) {
        // Boolean options must be cast to such
        options[bits[0]] = typeof(bits[1]) !== 'undefined' ? (bits[1] === 'true' ? true : false) : true;
      } else {
        options[bits[0]] = typeof(bits[1]) !== 'undefined' ? bits[1] : true;
      }
    });
  
    return options;
  }
  
  function stripHeader(source, type, specificOptions) {
    var headerRegex = getHeaderRegex(type);
    
    if (Array.isArray(specificOptions)) {
      var header = source.match(headerRegex)[0];

      specificOptions.forEach(function (option) {
        header = header.replace(new RegExp(option + '\\s*(|:.*?)(,\\s*|\\*\\/)'), '');
      });

      if (!header.match(/\*\/$/)) {
        header += '*/';
      }

      return source.replace(headerRegex, header.replace(/,\s*\*\//, ' */'));
    } else {
      return source.replace(headerRegex, '');
    }
  }
  
  return function (source, config) {
    correctGlobalsConfig(config);
    
    var fileHeaderOptions = getHeader(source, 'jshint'),
        fileGlobals = getHeader(source, 'globals'),
        optionsToUse = extend({}, config.jshint.options),
        globalsToUse = extend({}, config.jshint.globals);
    
    if (fileHeaderOptions) {
      switch (config.modes.options) {
      case 'mergeOver':
        // This requires us to strip out certain rules from their header.
        // so ours take precedence
        source = stripHeader(source, 'jshint', Object.keys(config.jshint.options));
        break;
      case 'leave':
        // Don't apply any options from our config
        optionsToUse = {};
        break;
      case 'clobber':
        // Only apply our options, strip theirs out
        source = stripHeader(source, 'jshint');
        break;
      default:
        // Default behaviour for jshintr & jshint, use our rules
        // as a base, but let theirs override.
      }
    }
    
    if (fileGlobals) {
      switch (config.modes.globals) {
      case 'mergeOver':
        // This requires us to strip out certain globals from their header.
        // so ours take precedence
        source = stripHeader(source, 'globals', Object.keys(config.jshint.globals));
        break;
      case 'leave':
        // Don't apply any globals from our config
        globalsToUse = {};
        break;
      case 'clobber':
        // Only apply our globals, strip theirs out
        source = stripHeader(source, 'globals');
        break;
      default:
        // Default behaviour for jshintr & jshint, use our rules
        // as a base, but let theirs override.
      }
    }
    
    return {
      passed: jshint(source, optionsToUse, globalsToUse),
      errors: jshint.errors,
      source: source
    };
  };
}());