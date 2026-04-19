hogan = require 'hogan.js'
{BaseLanguage} = require './base'

# Requires Hogan 1.0.4
#
# Example:
# $(@el).html(template.render name: "mdp", city: "SF")
class exports.HoganLanguage extends BaseLanguage
  compile: (path, callback) ->
    @readFile path, (error, data) =>
      return callback error if error?
      try
        content = hogan.compile data, asString: yes
        callback null, "exports.render = function(data) {
          var t = new Hogan.Template();
          t.r = #{content};
          return t.render(data);
        }"
      catch error
        callback error
