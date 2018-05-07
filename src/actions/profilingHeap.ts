import debug from 'debug'
debug('axm:profilingaction')

import ActionsFeature from '../features/actions'
import ProfilingFeature from '../features/profiling'
import ActionsInterface from './actionsInterface'
import MiscUtils from '../utils/miscellaneous'
import FileUtils from '../utils/file'

export default class ProfilingHeapAction implements ActionsInterface {

  private actionFeature: ActionsFeature
  private profilingFeature
  private config
  private uuid: string

  constructor (actionFeature: ActionsFeature, config?) {
    this.config = config
    if (!config) {
      this.config = {}
    }

    this.actionFeature = actionFeature
  }

  async init () {
    this.profilingFeature = new ProfilingFeature().init()
    try {
      await this.profilingFeature.heapProfiling.init(this.config.heap)
      this.exposeActions()
    } catch (err) {
      console.error(`Failed to load heap profiler: ${err.message}`)
    }
  }

  destroy () {
    if (this.profilingFeature) this.profilingFeature.destroy()
  }

  private exposeActions () {

    // -------------------------------------
    // Heap sampling
    // -------------------------------------
    this.actionFeature.action('km:heap:sampling:start', async (reply) => {
      try {
        this.uuid = MiscUtils.generateUUID()
        await this.profilingFeature.heapProfiling.start()
        reply({ success : true, uuid: this.uuid })
      } catch (err) {
        return reply({
          success: false,
          err : err,
          uuid: this.uuid
        })
      }

    })

    this.actionFeature.action('km:heap:sampling:stop', async (reply) => {
      try {
        const dumpFile = await this.profilingFeature.heapProfiling.stop()

        let size
        try {
          size = await FileUtils.getFileSize(dumpFile)
        } catch (err) {
          size = -1
        }

        return reply({
          success     : true,
          heapdump  : true,
          dump_file   : dumpFile,
          dump_file_size: size,
          uuid: this.uuid
        })

      } catch (err) {
        return reply({
          success: false,
          err : err,
          uuid: this.uuid
        })
      }
    })

    // -------------------------------------
    // Heap dump
    // -------------------------------------
    this.actionFeature.action('km:heapdump', async (reply) => {
      try {
        const dumpFile = await this.profilingFeature.heapProfiling.takeSnapshot()

        return reply({
          success     : true,
          heapdump    : true,
          dump_file   : dumpFile
        })
      } catch (err) {
        return reply({
          success: false,
          err : err
        })
      }
    })
  }
}
