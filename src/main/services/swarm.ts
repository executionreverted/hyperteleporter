import Hyperswarm, { type PeerDiscovery } from 'hyperswarm'
import type Corestore from 'corestore'

let swarm: Hyperswarm | null = null

export function getSwarm(): Hyperswarm {
  if (swarm) return swarm
  swarm = new Hyperswarm()
  return swarm
}

export function setupReplication(corestore: Corestore): void {
  const s = getSwarm()
  s.on('connection', (socket) => {
    try {
      corestore.replicate(socket)
    } catch {}
  })
}

export async function joinTopicOnce(topic: Buffer): Promise<PeerDiscovery> {
  const s = getSwarm()
  const discovery = s.join(topic, { server: true, client: true })
  await discovery.flushed()
  return discovery
}

export async function destroySwarm(): Promise<void> {
  if (!swarm) return
  try {
    await swarm.destroy()
  } catch {}
  swarm = null
}


