var path = require('path');

exports.summary = 'package generator';

exports.options = {
    name: {
        message: 'Project name',
        default: function () {
            var types = ['javascript', 'js'];
            var type = '(?:' + types.join('|') + ')';
            // This regexp matches:
            //   leading type- type. type_
            //   trailing -type .type _type and/or -js .js _js
            var re = new RegExp('^' + type + '[\\-\\._]?|(?:[\\-\\._]?' + type + ')?(?:[\\-\\._]?js)?$', 'ig');
            // Strip the above stuff from the current dirname.
            var name = path.basename(process.cwd()).replace(re, '');
            // Remove anything not a letter, number, dash, dot or underscore.
            return name.replace(/[^\w\-\.]/g, '');
        },
        validator: /^[\w\-\.]+$/,
        warning: 'Must be only letters, numbers, dashes, dots or underscores.',
        before: function (value) {
            // An additional value, safe to use as a JavaScript identifier.
            value = value.replace(/[\W_]+/g, '_').replace(/^(\d)/, '_$1');
            // An additional value that won't conflict with NodeUnit unit tests.
            return value === 'test' ? 'myTest' : value;
            // If no value is passed to `done`, the original property isn't modified.
        }
    },
    description: {
        message: 'Project description',
        default: 'The best project ever.',
        warning: 'May consist of any characters.'
    },
    version: {
        message: 'Version',
        default: '0.1.0',
        warning: 'Must be a valid semantic version (semver.org).'
    },
    author_name: {
        message: 'Author name',
        default: process.env.USER || process.env.USERNAME,
        warning: 'May consist of any characters.'
    },
    author_email: {
        message: 'Author email',
        warning: 'Should be a valid email address.'
    },
    author_url: {
        message: 'Author url',
        warning: 'Should be a public URL.'
    },
    repository: {
        message: 'Project git repository',
        default: 'git://github.com/{{author_name}}/{{name}}.git'
    },
    homepage: {
        message: 'Project homepage',
        default: 'https://github.com/{{author_name}}/{{name}}',
        warning: 'Should be a public URL.'
    },
    bugs: {
        message: 'Project issues tracker',
        // If GitHub is the origin, the issues tracker is easy to figure out.
        default: '{{homepage}}/issues',
        warning: 'Should be a public URL.'
    },
    licenses: {
        message: 'Licenses',
        default: 'MIT'
    },
    node_version: {
        message: 'What versions of node does it run on?',
        default: '>= 0.6.0',
        warning: 'Must be a valid semantic version range descriptor.'
    },
    main: {
        message: 'Main module/entry point',
        default: "index.js",
        warning: 'Must be a path relative to the project root.'
    },
    bin: {
        message: 'CLI script',
        default: 'bin/{{name}}',
        warning: 'Must be a path relative to the project root.'
    },
    npm_test: {
        message: 'Npm test command',
        default: "npm test",
        warning: 'Must be an executable command.'
    }
};

exports.run = function (options) {
    exports.copyTemplate("templates/package.json", "package.json");
};