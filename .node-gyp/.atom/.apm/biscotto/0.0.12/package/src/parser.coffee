fs           = require 'fs'
_            = require 'underscore'
_.str        = require 'underscore.string'
CoffeeScript = require 'coffee-script'

File          = require './nodes/file'
Class         = require './nodes/class'
Mixin         = require './nodes/mixin'
VirtualMethod = require './nodes/virtual_method'

{whitespace} = require('./util/text')

# CoffeeScript parser to convert the files into a
# documentation domain nodes.
#
module.exports = class Parser

  # Construct the parser
  #
  # options - the parser options (a [Object])
  #
  constructor: (@options) ->
    @files   = []
    @classes = []
    @mixins  = []

    @fileCount = 0
    @globalStatus = "Public"

    @classMemberRegex = """

                        """

  # Parse the given CoffeeScript file
  #
  # file - the CoffeeScript file name (a [String])
  #
  parseFile: (file) ->
    @parseContent fs.readFileSync(file, 'utf8'), file
    @fileCount += 1

  # Parse the given CoffeeScript content
  #
  # content - the CoffeeScript file content (a [String])
  # file - the CoffeeScript file name (a [String])
  #
  parseContent: (content, file = '') ->
    @previousNodes = []
    @globalStatus = "Public"

    # Defines typical conditions for entities we are looking through nodes
    entities =
      clazz: (node) -> node.constructor.name is 'Class' && node.variable?.base?.value?
      mixin: (node) -> node.constructor.name == 'Assign' && node.value?.base?.properties?

    # skip the comment conversion if we are in cautious mode
    if not @options.cautious
      content = @convertComments(content)

    try
      root = CoffeeScript.nodes(content)
    catch error
      console.log('Parsed CoffeeScript source:\n%s', content) if @options.debug
      throw error

    # Find top-level methods and constants that aren't within a class
    fileClass = new File(root, file, @options)
    @files.push(fileClass) unless fileClass.isEmpty()

    @linkAncestors root

    root.traverseChildren true, (child) =>
      entity = false

      for type, condition of entities
        if entities.hasOwnProperty(type)
          entity = type if condition(child)

      if entity

        # Check the previous tokens for comment nodes
        previous = @previousNodes[@previousNodes.length-1]
        switch previous?.constructor.name
          # A comment is preceding the class declaration
          when 'Comment'
            doc = previous
          when 'Literal'
            # The class is exported `module.exports = class Class`, take the comment before `module`
            if previous.value is 'exports'
              node = @previousNodes[@previousNodes.length-6]
              doc = node if node?.constructor.name is 'Comment'

        if entity == 'mixin'
          name = [child.variable.base.value]

          # If p.name is empty value is going to be assigned to index...
          name.push p.name?.value for p in child.variable.properties

          # ... and therefore should be just skippped.
          if name.indexOf(undefined) == -1
            mixin = new Mixin(child, file, @options, doc)

            if mixin.doc.mixin? && (@options.private || !mixin.doc.private)
              @mixins.push mixin

        if entity == 'clazz'
          clazz = new Class(child, file, @options, doc)


          if (!@options.private && clazz.doc.status == "Private")
            # no op
          else if (!@options.internal && clazz.doc.status == "Internal")
            # no op
          else
            @classes.push clazz

      @previousNodes.push child
      true

    root

  # Convert the comments to block comments,
  # so they appear in the nodes.
  #
  # content - the CoffeeScript file content (a [String])
  #
  convertComments: (content) ->
    result         = []
    comment        = []
    inComment      = false
    inBlockComment = false
    indentComment  = 0

    for line in content.split('\n')
      globalStatusBlock = false

      if globalStatusBlock = /^\s*#{3} (\w+).+?#{3}/.exec(line)
        @globalStatus = globalStatusBlock[1]

      blockComment = /^\s*#{3,}/.exec(line) && !/^\s*#{3,}.+#{3,}/.exec(line)

      if blockComment || inBlockComment
        inBlockComment = !inBlockComment if blockComment
        result.push line
      else
        commentLine = /^(\s*#)\s?(\s*.*)/.exec(line)
        if commentLine
          if inComment
            comment.push commentLine[2]?.replace /#/g, "\u0091#"
          else
            # append current global status flag if needed
            if !/^\s*\w+:/.test(commentLine[2])
              commentLine[2] = @globalStatus + ": " + commentLine[2]
            inComment = true
            indentComment =  commentLine[1].length - 1

            comment.push whitespace(indentComment) + '###'
            comment.push commentLine[2]?.replace /#/g, "\u0091#"
        else
          if inComment
            inComment = false
            comment.push whitespace(indentComment) + '###'

            # Push here comments only before certain lines
            if ///
                 ( # Class
                   class\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*
                 | # Mixin or assignment
                   ^\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff.]*\s+\=
                 | # Function
                   [$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*\s*:\s*(\(.*\)\s*)?[-=]>
                 | # Function
                   @[A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*\s*=\s*(\(.*\)\s*)?[-=]>
                 | # Function
                   [$A-Za-z_\x7f-\uffff][\.$\w\x7f-\uffff]*\s*=\s*(\(.*\)\s*)?[-=]>
                 | # Constant
                   ^\s*@[$A-Z_][A-Z_]*)
                 | # Properties
                   ^\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*:\s*\S+
               ///.exec line

              result.push c for c in comment

            comment = []
          # A method with no preceding description; apply the global status
          member = ///
                 ( # Class
                   class\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*
                 | # Mixin or assignment
                   ^\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff.]*\s+\=
                 | # Function
                   [$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*\s*:\s*(\(.*\)\s*)?[-=]>
                 | # Function
                   @[A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*\s*=\s*(\(.*\)\s*)?[-=]>
                 | # Function
                   [$A-Za-z_\x7f-\uffff][\.$\w\x7f-\uffff]*\s*=\s*(\(.*\)\s*)?[-=]>
                 | # Constant
                   ^\s*@[$A-Z_][A-Z_]*)
                 | # Properties
                   ^\s*[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*:\s*\S+
               ///.exec line

          if member and _.str.isBlank(_.last(result))
            indentComment = /^(\s*)/.exec(line)
            if indentComment
              indentComment = indentComment[1]
            else
              indentComment = ""

            result.push("#{indentComment}###")
            result.push("#{@globalStatus}:")
            result.push("#{indentComment}###")
          result.push line

    result.join('\n')

  # Attach each parent to its children, so we are able
  # to traverse the ancestor parse tree. Since the
  # parent attribute is already used in the class node,
  # the parent is stored as `ancestor`.
  #
  # nodes - the CoffeeScript nodes (a [Base])
  #
  linkAncestors: (node) ->
    node.eachChild (child) =>
      child.ancestor = node
      @linkAncestors child

  # Get all parsed methods
  #
  # Returns  (a ) [Array<Method>] all methods
  #
  getAllMethods: ->
    unless @methods
      @methods = []

      for file in @files
        @methods = _.union @methods, file.getMethods()

      for clazz in @classes
        @methods = _.union @methods, clazz.getMethods()

      for mixin in @mixins
        @methods = _.union @methods, mixin.getMethods()

    @methods

  # Get all parsed variables
  #
  # Returns  (a ) [Array<Variable>] all variables
  #
  getAllVariables: ->
    unless @variables
      @variables = []

    for file in @files
      @variables = _.union @variables, file.getVariables()

    for clazz in @classes
      @variables = _.union @variables, clazz.getVariables()

    for mixin in @mixins
      @methods = _.union @methods, mixin.getMethods()

    @variables

  # Show the parsing statistics
  #
  showResult: (generator) ->
    fileCount      = @files.length

    classCount     = @classes.length
    noDocClasses   = _.filter(@classes, (clazz) -> !clazz.getDoc().hasComment())
    noDocClassesLength   = noDocClasses.length

    mixinCount     = @mixins.length

    methodsToCount = _.filter(@getAllMethods(), (method) -> method not instanceof VirtualMethod)
    methodCount    = methodsToCount.length
    noDocMethods   = _.filter(methodsToCount, (method) -> !method.getDoc().hasComment())
    noDocMethodsLength = noDocMethods.length

    constants      = _.filter(@getAllVariables(), (variable) -> variable.isConstant())
    constantCount  = constants.length
    noDocConstants = _.filter(constants, (constant) -> !constant.getDoc().hasComment()).length

    totalFound = (classCount + methodCount + constantCount)
    totalNoDoc = (noDocClassesLength + noDocMethodsLength + noDocConstants)
    documented   = 100 - 100 / (classCount + methodCount + constantCount) * (noDocClassesLength + noDocMethodsLength + noDocConstants)

    maxCountLength = String(_.max([fileCount, mixinCount, classCount, methodCount, constantCount], (count) -> String(count).length)).length + 6
    maxNoDocLength = String(_.max([noDocClassesLength, noDocMethodsLength, noDocConstants], (count) -> String(count).length)).length

    stats =
      """
      Parsed files:    #{ _.str.pad(@fileCount, maxCountLength) }
      Classes:         #{ _.str.pad(classCount, maxCountLength) } (#{ _.str.pad(noDocClassesLength, maxNoDocLength) } undocumented)
      Mixins:          #{ _.str.pad(mixinCount, maxCountLength) }
      Non-Class files: #{ _.str.pad(fileCount, maxCountLength) }
      Methods:         #{ _.str.pad(methodCount, maxCountLength) } (#{ _.str.pad(noDocMethodsLength, maxNoDocLength) } undocumented)
      Constants:       #{ _.str.pad(constantCount, maxCountLength) } (#{ _.str.pad(noDocConstants, maxNoDocLength) } undocumented)
       #{ _.str.sprintf('%.2f', documented) }% documented (#{totalFound} total, #{totalNoDoc} with no doc)
       #{generator.referencer.errors} errors
      """

    if @options.missing
      noDocClassNames = []
      for noDocClass in noDocClasses
        noDocClassNames.push noDocClass.className

      noDocMethodNames = []
      prevFileName = ""
      for noDocMethod in noDocMethods
        if prevFileName != noDocMethod.entity.fileName
          prevFileName = noDocMethod.entity.fileName
          noDocMethodNames.push "\nIn #{prevFileName}:"

        noDocMethodNames.push noDocMethod.shortSignature

      stats += "\n"
      stats += "\nClasses missing docs:\n\n#{noDocClassNames.join('\n')}" if noDocClassNames.length > 0
      stats += "\n\nMethods missing docs:\n#{noDocMethodNames.join('\n')}" if noDocMethodNames.length > 0

    console.log stats

    if @options.json && @options.json.length
      fs.writeFileSync @options.json, JSON.stringify(@toJSON(), null, "    ");

  # Get a JSON representation of the object
  #
  # Returns the JSON object (a [Object])
  #
  toJSON: ->
    json = []

    for file in @files
      json.push file.toJSON()

    for clazz in @classes
      json.push clazz.toJSON()

    for mixin in @mixins
      json.push mixin.toJSON()

    json
