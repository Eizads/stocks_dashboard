<template>
  <q-card class="q-pa-md">
    <q-card-section>
      <h5>Live Stock Chart: {{ stockSymbol }}</h5>
    </q-card-section>
    <q-card-section>
      <LineChart ref="lineChartRef" :chart-data="chartData" :chart-options="options" />
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
// import { useStockStore } from 'src/stores/store'
import stocksService from 'src/services/stocks.js'
import { LineChart } from 'vue-chart-3'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Title,
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns' // ✅ Required for time-based X-axis

// ✅ Register only required Chart.js modules (Tree-Shakable)
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Title,
  Tooltip,
)

export default defineComponent({
  components: { LineChart },
  props: { stockSymbol: String },
  setup(props) {
    // const store = useStockStore()

    const options = ref({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour', // ✅ Show only full hours
            stepSize: 1, // ✅ Ensure one label per hour
            displayFormats: {
              hour: 'h:mm a', // ✅ Format as "11:00 AM", "12:00 PM", etc.
            },
          },
          ticks: {
            autoSkip: false, // ✅ Prevents skipping full hours
            source: 'auto',
            maxTicksLimit: 8, // ✅ Limits the number of labels to avoid clutter
          },
          min: new Date().setHours(9, 0, 0, 0), // ✅ Start at 9 AM
          max: new Date().setHours(16, 0, 0, 0), // ✅ End at 4 PM
        },
        y: { beginAtZero: false },
      },
    })

    const generateTimeLabels = () => {
      const times = []

      const startTime = new Date()
      startTime.setHours(9, 0, 0, 0) // set start time to 9:00 a.m.

      const endTime = new Date()
      endTime.setHours(16, 0, 0, 0) // set end time to 4:00 p.m.

      // Loop until the startTime exceeds the endTime
      while (startTime <= endTime) {
        // Format the current time label
        const label = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        times.push(label)

        // Increment the startTime by 1 minute
        startTime.setMinutes(startTime.getMinutes() + 1)
      }

      return times
    }

    const timestamps = ref(generateTimeLabels())
    const prices = ref(Array(timestamps.value.length).fill(null))

    const chartData = computed(() => ({
      labels: timestamps.value,
      datasets: [
        {
          label: `Stock Price (${props.stockSymbol})`,
          data: prices.value,
          borderColor: 'blue',
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
          tension: 0.3,
        },
      ],
    }))

    const updateChart = (price, time) => {
      console.log('price', price)
      console.log('time', time)

      const minTime = new Date(options.value.scales.x.min)
      const maxTime = new Date(options.value.scales.x.max)

      console.log('min', minTime)
      console.log('max', maxTime)
      // ✅ Find the matching index in the X-axis labels
      const index = timestamps.value.findIndex((t) => t === time)

      if (index !== -1) {
        prices.value[index] = price // ✅ Update only the matching time slot
        prices.value = [...prices.value] // ✅ Force reactivity update for Vue
      } else {
        console.warn(`Received timestamp (${time}) does not match any X-axis labels`)
      }
    }

    onMounted(() => {
      console.log('📡 Connecting WebSocket...')
      stocksService.connectWebSocket(props.stockSymbol, updateChart)
    })

    onUnmounted(() => {
      console.log('🛑 Disconnecting WebSocket...')
      stocksService.disconnectWebSocket()
    })

    watch(
      () => props.stockSymbol,
      () => {
        console.log(`🔄 Stock changed to: ${props.stockSymbol}, reconnecting WebSocket...`)
        stocksService.disconnectWebSocket()
        stocksService.connectWebSocket(props.stockSymbol, updateChart)
      },
    )

    return { chartData, options }
  },
})
</script>

<style scoped>
.q-card-section {
  height: 400px;
}
</style>

<!-- trial symbols -->
<!-- Forex:

EUR/USD (Euro/US Dollar)
Cryptocurrency:

BTC/USD (Bitcoin/US Dollar)
United States (US):

AAPL (Apple Inc)
QQQ (Invesco QQQ Trust)
ABML (American Battery Technology Company)
IXIC (NASDAQ Composite Index)
VFIAX (Vanguard 500 Index Fund)
Canada (CA):

TRP:TSX (TC Energy Corp)
SVI:TSXV (StorageVault Canada Inc)
MEDV:NEO (Medivolve Inc.)
India (IN):

INFY:NSE (Infosys Limited)
SUPERSHAKT:BSE (Supershakti Metaliks Limited)
Netherlands (NL):

ADYEN:Euronext (Adyen N.V.)
Belgium (BE):

BOTHE:Euronext (Bone Therapeutics SA)
Portugal (PT):

SLBEN:Euronext (Sport Lisboa e Benfica - Futebol, SAD)
France (FR):

ALMIL:Euronext (1000mercis)
Ireland (IE):

DQ7A:ISE (Donegal Investment Group plc) -->
