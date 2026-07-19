const jwt = require('jsonwebtoken')

const notesRouter = require('express').Router()

const Note = require('../models/note')
const User = require('../models/user')

const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '')
  }
  return null
}

notesRouter.get('/', async (request, response) => {
  const notes = await Note.find({}).populate('user', { username: 1, name: 1 })
  response.json(notes)
})

notesRouter.get('/:id', async (request, response, next) => {
  const note = await Note.findById(request.params.id)
  if (note) {
    response.json(note)
  } else {
    response.status(404).end()
  }
})

notesRouter.post('/', async (request, response, next) => {
  const body = request.body
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
  if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
  }

  // encrypted token replaced user id directly send in the request
  // we can decrypt it from the token if it's valid
  const user = await User.findById(decodedToken.id)

  const note = new Note({
    content: body.content,
    important: body.important || false, 
    user: user.id
  })

  const savedNote = await note.save()
  user.notes = user.notes.concat(savedNote._id)
  await user.save()

  response.status(201).json(savedNote)
})

notesRouter.delete('/:id', async (request, response, next) => {
  // try-catch is no longer needed since Express version 5
  try {
    await Note.findByIdAndDelete(request.params.id)
    response.status(204).end()
  } catch(exception) {
    next(exception)
  }
})

notesRouter.put('/:id', (request, response, next) => {
  const id = request.params.id
  const { content, important } = request.body

  Note.findById(id)
    .then(note => {
      if (!note) {
        response.status(404).end()
      } else {
        
        note.content = content
        note.important = important

        return note.save().then(updatedNote => {
          response.json(updatedNote)
        })
      }
    })
    .catch(error => {
      next(error)
    })
})

module.exports = notesRouter