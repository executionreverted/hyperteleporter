import Hyperswarm, { type PeerDiscovery } from 'hyperswarm'
import type Hyperdrive from 'hyperdrive'

// Store active swarm connections per drive
const activeSwarms = new Map<string, { swarm: Hyperswarm; discovery: PeerDiscovery }>()

export async function setupDriveReplication(driveId: string, hyperdrive: Hyperdrive): Promise<void> {
  // Clean up any existing swarm for this drive
  await cleanupDriveSwarm(driveId)
  
  const swarm = new Hyperswarm()
  const done = hyperdrive.findingPeers()
  
  swarm.on('connection', (socket) => {
    try {
      // Use drive.replicate() instead of corestore.replicate()
      hyperdrive.replicate(socket)
    } catch (error) {
      console.error(`[swarm] Error setting up replication for drive ${driveId}:`, error)
    }
  })
  
  // Join the drive's discovery topic
  const discovery = swarm.join(hyperdrive.discoveryKey, { server: true, client: true })
  
  // Wait for initial peer discovery to complete
  try {
    await discovery.flushed()
    done() // Signal that peer finding is done
  } catch (error) {
    console.error(`[swarm] Error during peer discovery for drive ${driveId}:`, error)
    done() // Still call done() to prevent hanging
  }
  
  // Store the active swarm
  activeSwarms.set(driveId, { swarm, discovery })
  
  console.log(`[swarm] Successfully set up replication for drive ${driveId}`)
}

export async function cleanupDriveSwarm(driveId: string): Promise<void> {
  const active = activeSwarms.get(driveId)
  if (!active) return
  
  try {
    await active.discovery.destroy()
    await active.swarm.destroy()
    activeSwarms.delete(driveId)
    console.log(`[swarm] Cleaned up swarm for drive ${driveId}`)
  } catch (error) {
    console.error(`[swarm] Error cleaning up swarm for drive ${driveId}:`, error)
  }
}

export async function destroyAllSwarms(): Promise<void> {
  const driveIds = Array.from(activeSwarms.keys())
  await Promise.all(driveIds.map(cleanupDriveSwarm))
  console.log('[swarm] Destroyed all active swarms')
}


