var format = require('../utils/format');
var file = require('../utils/file');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var uglifyjs = require('uglify-js');


exports.summary = 'Minify javascript files with uglifyjs';

exports.usage = '<src> [options]';

exports.options = {
    "d" : {
        alias : 'dest'
        ,default : '<src>'
        ,describe : 'destination directory or file'
    },

    "s" : {
        alias : 'suffix'
        ,default : '.min'
        ,describe : 'destination file suffix append'
    },

    'o': {
        alias: 'output'
        ,default : 'file'
        ,describe : 'specify output type: file pipe'
    },

    "c" : {
        alias : 'charset'
        ,default : 'utf-8'
        ,describe : 'file encoding type'
    }
};

exports.run = function (options) {

    var dest = options.dest;
    var charset = options.charset;
    var output = options.output;
    var suffix = options.suffix;

    var uglifyjsOptions = options['options'] || {};

    var result;
    exports.files.forEach(function(inputFile){

        if(output === 'file'){

            var outputFile = inputFile;
            // console.log(dest, file.isDirFormat(dest));

            if(file.isDirFormat(dest)){
                outputFile = path.join(dest , path.basename(outputFile) );

                // suffix
                if(suffix)
                    outputFile = file.suffix(inputFile, suffix);

            }else{
                outputFile = dest;
            }

        }

        result = exports.uglifyjs(inputFile, outputFile, uglifyjsOptions ,charset);  // TODO

    });
    return result;

};

/**
 * Checks if a given piece of text (sctipt, stylesheet) is minified.
 *
 * The logic is: we strip consecutive spaces, tabs and new lines and
 * if this improves the size by more that 20%, this means there's room for improvement.
 *
 * @param {String} contents The text to be checked for minification
 * @return {Boolean} TRUE if minified, FALSE otherwise
 */
function isMinified(contents) {
    var len = contents.length,
        striplen;

    if (len === 0) { // blank is as minified as can be
        return true;
    }

    // TODO: enhance minifier logic by adding comment checking: \/\/[\w\d \t]*|\/\*[\s\S]*?\*\/
    // even better: add jsmin/cssmin
    striplen = contents.replace(/\n| {2}|\t|\r/g, '').length; // poor man's minifier
    if (((len - striplen) / len) > 0.1) { // we saved 10%, so this component can get some mifinication done
        return false;
    }

    return true;
}


exports.uglifyjs = function(inputFile, outputFile, options, charset){

    charset = charset || "utf-8";

    // more: https://github.com/mishoo/UglifyJS
    var defaultOptions = {

        consolidate: false,
        show_copyright: true,
        max_line_length: 32 * 1024,
        lift_vars: false,

        mangle: true,
        mangle_toplevel: false,
        no_mangle_functions: false,
        defines: { },
        reserved: null,

        squeeze: true,
        make_seqs: true,
        dead_code: true,
        unsafe: false,


        // for gen_code fn
        ascii_only: true,
        beautify: false,
        indent_level: 4,
        indent_start: 0,
        quote_keys: false,
        space_colon: false,
        inline_script: false

    };

    options = _.defaults(options, defaultOptions);

    var jsp = uglifyjs.parser;
    var pro = uglifyjs.uglify;
    var consolidator = uglifyjs.consolidator
    var ast, pos;
    var input = file.read(inputFile, charset);

    if(isMinified(input)){
        exports.log("Skipping minified file " + inputFile);
        return input;
    }
    // skip empty files
    else if (input.length) {

        if(outputFile){
            exports.log("Minifying " + inputFile + " > " + outputFile);
        }

        var result = "";
        if (options.show_copyright) {
            var tok = jsp.tokenizer(input), c;
            c = tok();
            result += getCopyright(c.comments_before);
        }

        try {
            ast = jsp.parse(input);

            if (options.consolidate) {
                ast = consolidator.ast_consolidate(ast);
            }

            if (options.lift_vars) {
                ast = pro.ast_lift_variables(ast);
            }

            ast = pro.ast_mangle(ast, {
                mangle       : options.mangle,
                toplevel     : options.mangle_toplevel,
                defines      : options.defines,
                except       : options.reserved,
                no_functions : options.no_mangle_functions
            });

            if(options.squeeze){

                ast = pro.ast_squeeze(ast, {
                    make_seqs  : options.make_seqs,
                    dead_code  : options.dead_code,
                    keep_comps : !options.unsafe,
                    unsafe     : options.unsafe
                });

                if (options.unsafe)
                    ast = pro.ast_squeeze_more(ast);
            }


            var minimized = pro.gen_code(ast, options);


            if (!options.beautify && options.max_line_length) {
                minimized = pro.split_lines(minimized, options.max_line_length);
            }

            // output = copyright + minimized
            result += minimized;

            // output to file
            if(outputFile){

                file.write(outputFile, result, charset);

                var diff = input.length - minimized.length,
                    savings = input.length ? ((100 * diff) / minimized.length).toFixed(2) : 0;
                var info = 'Original size: ' + format.commify(input.length)  +
                    '. Minified size: ' + format.commify(minimized.length) +
                    '. Savings: ' + format.commify(diff) + ' (' + savings + '%)';

                exports.log(info);

            }

            // return result content always
            return result;

        } catch(e) {
            // Something went wrong.

            pos = '['.red + ('L' + e.line).yellow + ':'.red + ('C' + e.col).yellow + ']'.red;
            throw Error( pos + ' ' + (e.message + ' (position: ' + e.pos + ')').yellow );

        }

    } else {
        exports.log("Skipping empty file " + inputFile);
    }

};



function getCopyright(comments) {
    var ret = "";
    for (var i = 0; i < comments.length; ++i) {
        var c = comments[i];
        // the white list of copyright keywords
        if(/copyright|preserve|license/i.test(c.value)){

            if (c.type == "comment1") {

                ret += "//" + c.value + "\n";
            } else {
                ret += "/*" + c.value + "*/";
            }

         }

    }
    return ret;
}