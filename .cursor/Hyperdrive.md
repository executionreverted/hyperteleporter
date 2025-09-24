# Hyperdrive

[See API docs at docs.pears.com](https://docs.pears.com/building-blocks/hyperdrive)

Hyperdrive is a secure, real-time distributed file system

## Install

```sh
npm install hyperdrive
```

## Usage

```js
const Hyperdrive = require('hyperdrive')
const Corestore = require('corestore')

const store = new Corestore('./storage')
const drive = new Hyperdrive(store)

await drive.put('/blob.txt', Buffer.from('example'))
await drive.put('/images/logo.png', Buffer.from('..'))
await drive.put('/images/old-logo.png', Buffer.from('..'))

const buffer = await drive.get('/blob.txt')
console.log(buffer) // => <Buffer ..> "example"

const entry = await drive.entry('/blob.txt')
console.log(entry) // => { seq, key, value: { executable, linkname, blob, metadata } }

await drive.del('/images/old-logo.png')

await drive.symlink('/images/logo.shortcut', '/images/logo.png')

for await (const file of drive.list('/images')) {
  console.log('list', file) // => { key, value }
}

const rs = drive.createReadStream('/blob.txt')
for await (const chunk of rs) {
  console.log('rs', chunk) // => <Buffer ..>
}

const ws = drive.createWriteStream('/blob.txt')
ws.write('new example')
ws.end()
ws.once('close', () => console.log('file saved'))
```

## API

#### `const drive = new Hyperdrive(store, [key])`

Creates a new Hyperdrive instance. `store` must be an instance of `Corestore`.

By default it uses the core at `{ name: 'db' }` from `store`, unless you set the public `key`.

#### `await drive.ready()`

Waits until internal state is loaded.

Use it once before reading synchronous properties like `drive.discoveryKey`, unless you called any of the other APIs.

#### `await drive.close()`

Fully close this drive, including its underlying Hypercore backed datastructures.

#### `drive.corestore`

The Corestore instance used as storage.

#### `drive.db`

The underlying Hyperbee backing the drive file structure.

#### `drive.core`

The Hypercore used for `drive.db`.

#### `drive.id`

String containing the id (z-base-32 of the public key) identifying this drive.

#### `drive.key`

The public key of the Hypercore backing the drive.

#### `drive.discoveryKey`

The hash of the public key of the Hypercore backing the drive.

Can be used as a `topic` to seed the drive using Hyperswarm.

#### `drive.contentKey`

The public key of the [Hyperblobs](https://github.com/holepunchto/hyperblobs) instance holding blobs associated with entries in the drive.

#### `drive.writable`

Boolean indicating if we can write or delete data in this drive.

#### `drive.readable`

Boolean indicating if we can read from this drive. After closing the drive this will be `false`.

#### `drive.version`

Number that indicates how many modifications were made, useful as a version identifier.

#### `drive.supportsMetadata`

Boolean indicating if the drive handles or not metadata. Always `true`.

#### `await drive.put(path, buffer, [options])`

Creates a file at `path` in the drive. `options` are the same as in `createWriteStream`.

#### `const buffer = await drive.get(path, [options])`

Returns the blob at `path` in the drive. If no blob exists, returns `null`.

It also returns `null` for symbolic links.

`options` include:
```js
{
  wait: true, // Wait for block to be downloaded
  timeout: 0 // Wait at max some milliseconds (0 means no timeout)
}
```

#### `const entry = await drive.entry(path, [options])`

Returns the entry at `path` in the drive. It looks like this:
```js
{
  seq: Number,
  key: String,
  value: {
    executable: Boolean, // Whether the blob at path is an executable
    linkname: null, // If entry not symlink, otherwise a string to the entry this links to
    blob: { // Hyperblobs id that can be used to fetch the blob associated with this entry
      blockOffset: Number,
      blockLength: Number,
      byteOffset: Number,
      byteLength: Number
    },
    metadata: null
  }
}
```

`options` include:
```js
{
  follow: false, // Follow symlinks, 16 max or throws an error
  wait: true, // Wait for block to be downloaded
  timeout: 0 // Wait at max some milliseconds (0 means no timeout)
}
```

#### `const exists = await drive.exists(path)`

Returns `true` if the entry at `path` does exists, otherwise `false`.

#### `await drive.del(path)`

Deletes the file at `path` from the drive.

#### `const comparison = drive.compare(entryA, entryB)`

Returns `0` if entries are the same, `1` if `entryA` is older, and `-1` if `entryB` is older.

#### `const cleared = await drive.clear(path, [options])`

Deletes the blob from storage to free up space, but the file structure reference is kept.

`options` include:
```js
{
  diff: false // Returned `cleared` bytes object is null unless you enable this
}
```

#### `const cleared = await drive.clearAll([options])`

Deletes all the blobs from storage to free up space, similar to how `drive.clear()` works.

`options` include:
```js
{
  diff: false // Returned `cleared` bytes object is null unless you enable this
}
```

#### `await drive.truncate(version, [options] })`

Truncates the Hyperdrive to a previous version (both the file-structure reference and the blobs).

A `blobs: <length>` option can be passed in if you know the corresponding blobs length, but it is recommended to let the method figure it out for you.

#### `await drive.purge()`

Purge both cores (db and blobs) from your storage, completely removing all the drive's data.

#### `await drive.symlink(path, linkname)`

Creates an entry in drive at `path` that points to the entry at `linkname`.

If a blob entry currently exists at `path` then it will get overwritten and `drive.get(key)` will return `null`, while `drive.entry(key)` will return the entry with symlink information.

#### `const batch = drive.batch()`

Useful for atomically mutate the drive, has the same interface as Hyperdrive.

#### `await batch.flush()`

Commit a batch of mutations to the underlying drive.

#### `const stream = drive.list(folder, [options])`

Returns a stream of all entries in the drive at paths prefixed with `folder`.

`options` include:
```js
{
  recursive: true | false // Whether to descend into all subfolders or not,
  ignore: String || Array // Ignore files and folders by name,
  wait: true, // Wait for block to be downloaded.
}
```

#### `const stream = drive.readdir(folder, [options])`

Returns a stream of all subpaths of entries in drive stored at paths prefixed by `folder`.

`options` include:
```js
{
  wait: true, // Wait for block to be downloaded
}
```

#### `const stream = await drive.entries([range], [options])`

Returns a read stream of entries in the drive.

`options` are the same as `Hyperbee().createReadStream([range], [options])`.

#### `const mirror = drive.mirror(out, [options])`

Efficiently mirror this drive into another. Returns a [`MirrorDrive`](https://github.com/holepunchto/mirror-drive#api) instance constructed with `options`.

Call `await mirror.done()` to wait for the mirroring to finish.

#### `const watcher = drive.watch([folder])`

Returns an iterator that listens on `folder` to yield changes, by default on `/`.

Usage example:
```js
for await (const [current, previous] of watcher) {
  console.log(current.version)
  console.log(previous.version)
}
```

Those `current` and `previous` are snapshots that are auto-closed before next value.

Don't close those snapshots yourself because they're used internally, let them be auto-closed.

`await watcher.ready()`

Waits until the watcher is loaded and detecting changes.

`await watcher.destroy()`

Stops the watcher. You could also stop it by using `break` in the loop.

#### `const rs = drive.createReadStream(path, [options])`

Returns a stream to read out the blob stored in the drive at `path`.

`options` include:
```js
{
  start: Number, // `start` and `end` are inclusive
  end: Number,
  length: Number, // `length` overrides `end`, they're not meant to be used together
  wait: true, // Wait for blocks to be downloaded
  timeout: 0 // Wait at max some milliseconds (0 means no timeout)
}
```

#### `const ws = drive.createWriteStream(path, [options])`

Stream a blob into the drive at `path`.

`options` include:
```js
{
  executable: Boolean,
  metadata: null // Extended file information i.e. arbitrary JSON value
}
```

#### `const download = drive.download(folder, [options])`

Downloads the blobs corresponding to all entries in the drive at paths prefixed with `folder`. Returns a `Download` object that resolves once all data has been downloaded:

```js
const download = await drive.download(key)
await download.done()
```

You can also cancel an ongoing download using `destroy()`.

```js
download.destroy()
```

`options` are the same as those for `drive.list(folder, [options])`.

#### `const snapshot = drive.checkout(version)`

Get a read-only snapshot of a previous version.

#### `const stream = drive.diff(version, folder, [options])`

Efficiently create a stream of the shallow changes to `folder` between `version` and `drive.version`.

Each entry is sorted by key and looks like this:
```js
{
  left: Object, // Entry in folder at drive.version for some path
  right: Object, // Entry in folder at drive.checkout(version) for some path
}
```

If an entry exists in `drive.version` of the `folder` but not in `version`, then `left` is set and `right` will be `null`, and vice versa.

#### `await drive.downloadDiff(version, folder, [options])`

Downloads all the blobs in `folder` corresponding to entries in `drive.checkout(version)` that are not in `drive.version`. Returns a `Download` object that resolves once all data has been downloaded:

```js
const download = await drive.downloadDiff(version, folder)
await download.done()
```

You can also cancel an ongoing download using `destroy()`.

```js
download.destroy()
```

In other words, downloads all the blobs added to `folder` up to `version` of the drive.

#### `await drive.downloadRange(dbRanges, blobRanges)`

Downloads the entries and blobs stored in the [ranges][core-range-docs] `dbRanges` and `blobRanges`. Returns a `Download` object that resolves once all data has been downloaded:


```js
const download = await drive.downloadRange(dbRanges, blobRanges)
await download.done()
```

You can also cancel an ongoing download using `destroy()`.

```js
download.destroy()
```

#### `await drive.has(path)`

Checks if path is saved to local store already.

#### `const done = drive.findingPeers()`

Indicate to Hyperdrive that you're finding peers in the background, requests will be on hold until this is done.

Call `done()` when your current discovery iteration is done, i.e. after `swarm.flush()` finishes.

#### `const stream = drive.replicate(isInitiatorOrStream)`

Usage example:
```js
const swarm = new Hyperswarm()
const done = drive.findingPeers()
swarm.on('connection', (socket) => drive.replicate(socket))
swarm.join(drive.discoveryKey)
swarm.flush().then(done, done)
```

See more about how replicate works at [corestore.replicate][store-replicate-docs].

#### `const updated = await drive.update([options])`

Waits for initial proof of the new drive version until all `findingPeers` are done.

`options` include:
```js
{
  wait: false
}
```

Use `drive.findingPeers()` or `{ wait: true }` to make await `drive.update()` blocking.

#### `const blobs = await drive.getBlobs()`

Returns the [Hyperblobs](https://github.com/holepunchto/hyperblobs) instance storing the blobs indexed by drive entries.

```js
await drive.put('/file.txt', Buffer.from('hi'))

const buffer1 = await drive.get('/file.txt')

const blobs = await drive.getBlobs()
const entry = await drive.entry('/file.txt')
const buffer2 = await blobs.get(entry.value.blob)

// => buffer1 and buffer2 are equals
```

[core-range-docs]: https://github.com/holepunchto/hypercore#const-range--coredownloadrange
[store-replicate-docs]: https://github.com/holepunchto/corestore#const-stream--storereplicateoptsorstream

#### `const blobsLength = await drive.getBlobsLength(checkout)`

Returns the length of the Hyperblobs instance at the time of the specified Hyperdrive version (defaults to the current version).

## License

Apache-2.0





## Example react codes for file sharing apps:


Example user context of an app

```tsx

/* global Pear */

import { createContext, useEffect, useRef, useState } from 'react'
import { html } from 'htm/react'
import Corestore from 'corestore'
import Hyperdrive from 'hyperdrive'
import Localdrive from 'localdrive'
import downloadsFolder from 'downloads-folder'

const UserContext = createContext()

function UserProvider ({ config, ...props }) {
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState({})
  const [files, setFiles] = useState([])
  const corestoreRef = useRef(new Corestore(config.storage))
  const hyperdriveRef = useRef(new Hyperdrive(corestoreRef.current))
  const localdriveRef = useRef(new Localdrive(downloadsFolder()))

  // Does it make sense to put here??
  Pear.teardown(async () => {
    await corestoreRef.current.close()
  })

  useEffect(() => {
    hyperdriveRef.current.ready()
      .then(initProfile)
      .then(getProfile)
      .then(getFiles)
      .then(() => setLoaded(true))
  }, [hyperdriveRef])

  async function initProfile () {
    const exists = await hyperdriveRef.current.exists('/meta/profile.json')
    if (exists) return
    await updateProfile({ name: 'No name' })
  }

  async function updateProfile (profile) {
    await hyperdriveRef.current.put('/meta/profile.json', Buffer.from(JSON.stringify(profile)))
  }

  async function getProfile () {
    console.log('[UserProvider] getProfile()')
    const buf = await hyperdriveRef.current.get('/meta/profile.json')
    setProfile(JSON.parse(buf))
  }

  async function getFiles () {
    console.log('[UserProvider] getFiles()')
    const newFiles = []
    const stream = hyperdriveRef.current.list('/files', { recursive: false })
    for await (const file of stream) {
      newFiles.push(file)
    }
    setFiles(newFiles)
  }

  useEffect(() => {
    const profileWatcher = hyperdriveRef.current.watch('/meta', { recursive: false })

    watchForever()
    async function watchForever () {
      for await (const _ of profileWatcher) { // eslint-disable-line no-unused-vars
        await getProfile()
      }
    }

    return async () => {
      await profileWatcher.destroy()
    }
  }, [hyperdriveRef.current])

  useEffect(() => {
    const filesWatcher = hyperdriveRef.current.watch('/files')

    watchForever()
    async function watchForever () {
      for await (const _ of filesWatcher) { // eslint-disable-line no-unused-vars
        await getFiles()
      }
    }

    return async () => {
      await filesWatcher.destroy()
    }
  }, [hyperdriveRef.current])

  return html`
    <${UserContext.Provider}
      value=${{
        loaded,
        profile,
        updateProfile,
        files,
        corestore: corestoreRef.current,
        hyperdrive: hyperdriveRef.current,
        localdrive: localdriveRef.current,
        downloadsFolder: downloadsFolder()
      }}
      ...${props}
    />
  `
}

export { UserContext, UserProvider }
```


# Example P2P Provider: 
```tsx
/* global Pear */

import { createContext, useEffect, useState, useRef } from 'react'
import { html } from 'htm/react'
import Hyperbee from 'hyperbee'
import Hyperdrive from 'hyperdrive'
import Hyperswarm from 'hyperswarm'
import useUser from '../hooks/use-user'
import ProtomuxRPC from 'protomux-rpc'
import hic from 'hypercore-id-encoding'

const PeersContext = createContext()

function PeersProvider ({ name, topic, ...props }) {
  const [loaded, setLoaded] = useState(false)
  const user = useUser()
  const [peers, setPeers] = useState([])
  const hyperswarm = useRef()
  const hyperbee = new Hyperbee(user.corestore.get({
    name: 'peers'
  }), {
    keyEncoding: 'utf-8',
    valueEncoding: 'json'
  })

  useEffect(() => {
    loadPeers()
      .then(initSwarm)
      .then(() => setLoaded(true))

    async function loadPeers () {
      for await (const { key, value: { driveKey } } of hyperbee.createReadStream()) {
        add({ key, driveKey })
      }
    }

    async function initSwarm () {
      hyperswarm.current = new Hyperswarm({
        keyPair: await user.corestore.createKeyPair('first-app')
      })

      Pear.teardown(async () => {
        await hyperswarm.current.destroy()
      })

      hyperswarm.current.on('connection', async (conn, info) => {
        const key = conn.remotePublicKey.toString('hex')
        const rpc = new ProtomuxRPC(conn)
        console.log('[connection joined]', info)
        // TODO: Set online status
        // knownPeersOnlineStatus[key] = true

        user.corestore.replicate(conn)

        // If someone asks who we are, then tell them our driveKey
        rpc.respond('whoareyou', async req => {
          console.log('[whoareyou respond]')
          return Buffer.from(JSON.stringify({
            driveKey: user.hyperdrive.key.toString('hex')
          }))
        })

        conn.on('close', () => {
          console.log(`[connection left] ${conn}`)
          console.log('should update online status')
        })

        // If we have never seen the peer before, then ask them who they are so
        // we can get their hyperdrive key.
        // On subsequent boots we already know them, so it doesn't matter if they
        // are online or not, before we can see and download their shared files
        // as long as someone in the network has accessed them.
        const peer = await hyperbee.get(key)
        const isAlreadyKnownPeer = !!peer
        if (isAlreadyKnownPeer) return

        console.log('[whoareyou request] This peer is new, ask them for their hyperdrive key')
        const reply = await rpc.request('whoareyou')
        const { driveKey } = JSON.parse(reply.toString())
        await add({
          key,
          driveKey
        })
      })

      // If this is an example app, then this key preferably should not be in sourcecode
      // But the app.key may not exist before `pear stage/release` has been called, so
      // maybe there is another 32-byte key we can use?
      const discovery = hyperswarm.current.join(hic.decode(topic), { server: true, client: true })
      await discovery.flushed()
    }
  }, [])

  async function add ({ key, driveKey }) {
    console.log(`[PeersProvider] add() key=${key} driveKey=${driveKey}`)
    const hyperdrive = new Hyperdrive(user.corestore, driveKey)
    await hyperdrive.ready()
    await hyperbee.put(key, { driveKey })

    setPeers(peers => ({
      ...peers,
      [key]: {
        hyperdrive
      }
    }))
  }

  return html`
    <${PeersContext.Provider}
      value=${{
        loaded,
        peers
      }}
      ...${props}
    />
  `
}

export { PeersContext, PeersProvider }
```

# usePeer hook for file watching and utils

```tsx
import { useState, useEffect } from 'react'

export default ({ hyperdrive }) => {
  const [profile, setProfile] = useState({})
  const [files, setFiles] = useState([])

  useEffect(() => {
    getProfile()
    getFiles()
  }, [])

  async function getProfile () {
    console.log('[use-peer] getProfile()')
    const buf = await hyperdrive.get('/meta/profile.json')
    setProfile(JSON.parse(buf))
  }

  async function getFiles () {
    console.log('[use-peer] getFiles()')
    const newFiles = []
    const stream = hyperdrive.list('/files', { recursive: false })
    for await (const file of stream) {
      newFiles.push(file)
    }
    setFiles(newFiles)
  }

  useEffect(() => {
    const profileWatcher = hyperdrive.watch('/meta', { recursive: false })

    watchForever()
    async function watchForever () {
      for await (const _ of profileWatcher) { // eslint-disable-line no-unused-vars
        await getProfile()
      }
    }

    return async () => {
      await profileWatcher.destroy()
    }
  }, [hyperdrive])

  useEffect(() => {
    const filesWatcher = hyperdrive.watch('/files')

    watchForever()
    async function watchForever () {
      for await (const _ of filesWatcher) { // eslint-disable-line no-unused-vars
        await getFiles()
      }
    }

    return async () => {
      await filesWatcher.destroy()
    }
  }, [hyperdrive])

  return {
    profile,
    files
  }
}
```