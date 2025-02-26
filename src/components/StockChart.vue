<template>
  <q-card class="q-pa-md">
    <q-card-section>
      <h5>Live Stock Chart: {{ stockSymbol }}</h5>
      {{ timeSeries }}
    </q-card-section>
    <q-card-section>
      <LineChart ref="lineChartRef" :chart-data="chartData" :chart-options="options" />
    </q-card-section>
  </q-card>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStockStore } from 'src/stores/store'
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
    const timeSeries = ref([])
    const store = useStockStore()
    const lastUpdatedTime = ref(null) // ✅ Track last updated time every 5 mins
    // Define reactive min/max values for Y-axis
    const suggestedMin = ref(null)
    const suggestedMax = ref(null)

    const options = ref({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
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
          min: new Date().setHours(9, 30, 0, 0), // ✅ Start at 9 AM
          max: new Date().setHours(16, 0, 0, 0), // ✅ End at 4 PM
        },
        y: {
          display: true,
          beginAtZero: false,
          suggestedMin: suggestedMin.value, // ✅ min value
          suggestedMax: suggestedMax.value, // ✅ max value
          ticks: {
            callback: function (value) {
              return value.toFixed(2) // Ensures 2 decimal places
            },

            stepSize: 0.5, // Adjust this based on your range

            autoSkip: false, // ✅ Prevents skipping full hours
            source: 'auto',
            maxTicksLimit: 5, // ✅ Limits the number of labels to avoid clutter
          },
        },
      },
    })

    const generateTimeLabels = () => {
      const times = []

      const startTime = new Date()
      startTime.setHours(9, 30, 0, 0) // set start time to 9:00 a.m.

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

    console.log('timestamps', timestamps.value)
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
      options: Object.assign({}, options.value),
    }))

    const updateChart = (price, time) => {
      console.log('price', price)
      console.log('time', time)

      const minTime = new Date(options.value.scales.x.min)
      const maxTime = new Date(options.value.scales.x.max)

      console.log('min', minTime)
      console.log('max', maxTime)
      if (time >= minTime && time <= maxTime) {
        const currentMinute = time

        // ✅ Only update if it's a new minute
        if (
          lastUpdatedTime.value == null ||
          (currentMinute >= lastUpdatedTime.value + 1 && lastUpdatedTime.value !== currentMinute) ||
          currentMinute === 0
        ) {
          prices.value.push({ x: time, y: price }) // ✅ Add new data point dynamically
          prices.value = [...prices.value] // ✅ Force Vue reactivity update
          lastUpdatedTime.value = currentMinute

          // ✅ Keep Y-axis stable while setting a reasonable range
          const minPrice = Math.min(...prices.value.map((d) => d.y)) * 0.98 // 2% buffer below
          const maxPrice = Math.max(...prices.value.map((d) => d.y)) * 1.02 // 2% buffer above

          options.value.scales.y.suggestedMin = minPrice
          options.value.scales.y.suggestedMax = maxPrice
        } else {
          console.log(`⏳ Ignoring duplicate update for ${time}`)
        }
      } else {
        console.warn(`⚠️ Ignored timestamp (${time}), outside of X-axis range`)
      }
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

      timeSeries.value = store.fetchStockHistory(props.stockSymbol)
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

    return { chartData, options, timeSeries }
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
