Chaplin = require 'chaplin'
mediator = require 'mediator'

# Application-specific utilities
# ------------------------------

# Delegate to Chaplin’s utils module
utils = Chaplin.utils.beget Chaplin.utils

_(utils).extend
  # We don’t use jQuery here because jQuery does not attach an error
  # handler to the script. In jQuery, a proper error handler only works
  # for same-origin scripts which can be loaded via XHR.
  loadLib: (url, success, error, timeout = 7500) ->
    head = document.head or document.getElementsByTagName('head')[0] or
      document.documentElement
    script = document.createElement 'script'
    script.async = 'async'
    script.src   = url
  
    onload = (_, aborted = false) ->
      return unless (aborted or
      not script.readyState or script.readyState is 'complete')
  
      clearTimeout timeoutHandle
  
      # Handle memory leak in IE
      script.onload = script.onreadystatechange = script.onerror = null
      # Remove the script elem and its reference
      head.removeChild(script) if head and script.parentNode
      script = undefined
  
      success() if success and not aborted
  
    script.onload = script.onreadystatechange = onload
  
    # This is what jQuery is missing
    script.onerror = ->
      onload null, true
      error() if error
  
    timeoutHandle = setTimeout script.onerror, timeout
    head.insertBefore script, head.firstChild

  # Functional helpers for handling asynchronous dependancies and I/O
  # -----------------------------------------------------------------

  ###
  Wrap methods so they can be called before a deferred is resolved.
  The actual methods are called once the deferred is resolved.

  Parameters:

  Expects an options hash with the following properties:

  deferred
    The Deferred object to wait for.

  methods
    Either:
    - A string with a method name e.g. 'method'
    - An array of strings e.g. ['method1', 'method2']
    - An object with methods e.g. {method: -> alert('resolved!')}

  host (optional)
    If you pass an array of strings in the `methods` parameter the methods
    are fetched from this object. Defaults to `deferred`.

  target (optional)
    The target object the new wrapper methods are created at.
    Defaults to host if host is given, otherwise it defaults to deferred.

  onDeferral (optional)
    An additional callback function which is invoked when the method is called
    and the Deferred isn't resolved yet.
    After the method is registered as a done handler on the Deferred,
    this callback is invoked. This can be used to trigger the resolving
    of the Deferred.

  Examples:

  deferMethods(deferred: def, methods: 'foo')
    Wrap the method named foo of the given deferred def and
    postpone all calls until the deferred is resolved.

  deferMethods(deferred: def, methods: def.specialMethods)
    Read all methods from the hash def.specialMethods and
    create wrapped methods with the same names at def.

  deferMethods(
    deferred: def, methods: def.specialMethods, target: def.specialMethods
  )
    Read all methods from the object def.specialMethods and
    create wrapped methods at def.specialMethods,
    overwriting the existing ones.

  deferMethods(deferred: def, host: obj, methods: ['foo', 'bar'])
    Wrap the methods obj.foo and obj.bar so all calls to them are postponed
    until def is resolved. obj.foo and obj.bar are overwritten
    with their wrappers.

  ###
  deferMethods: (options) ->
    # Process options
    deferred = options.deferred
    methods = options.methods
    host = options.host or deferred
    target = options.target or host
    onDeferral = options.onDeferral

    # Hash with named functions
    methodsHash = {}

    if typeof methods is 'string'
      # Transform a single method string into an object
      methodsHash[methods] = host[methods]

    else if methods.length and methods[0]
      # Transform a method list into an object
      for name in methods
        func = host[name]
        unless typeof func is 'function'
          throw new TypeError "utils.deferMethods: method #{name} not
found on host #{host}"
        methodsHash[name] = func

    else
      # Treat methods parameter as a hash, no transformation
      methodsHash = methods

    # Process the hash
    for own name, func of methodsHash
      # Ignore non-function properties
      continue unless typeof func is 'function'
      # Replace method with wrapper
      target[name] = utils.createDeferredFunction(
        deferred, func, target, onDeferral
      )

  # Creates a function which wraps `func` and defers calls to
  # it until the given `deferred` is resolved. Pass an optional `context`
  # to determine the this `this` binding of the original function.
  # Defaults to `deferred`. The optional `onDeferral` function to after
  # original function is registered as a done callback.
  createDeferredFunction: (deferred, func, context = deferred, onDeferral) ->
    # Return a wrapper function
    ->
      # Save the original arguments
      args = arguments
      if deferred.state() is 'resolved'
        # Deferred already resolved, call func immediately
        func.apply context, args
      else
        # Register a done handler
        deferred.done ->
          func.apply context, args
        # Invoke the onDeferral callback
        if typeof onDeferral is 'function'
          onDeferral.apply context

module.exports = utils
