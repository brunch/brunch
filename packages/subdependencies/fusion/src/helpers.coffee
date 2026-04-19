exports.printLine = (line) -> process.stdout.write line + '\n'

# Changes first letter of the word to upper case
capitalize = (word) ->
  word.charAt(0).toUpperCase() + word.slice(1)

# Removes all underscores and capitalize all words except the first one
exports.underscoreToCamelCase = (input) ->
  words = input.split "_"
  words = [words[0]].concat(capitalize(word) for word in words[1...words.length])
  words.join('')
