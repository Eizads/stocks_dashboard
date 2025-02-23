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
      const now = new Date()
      const start = new Date(now.getHours(), now.getMinutes(), 9, 0, 0)
      const end = new Date(now.getHours(), now.getMinutes(), 16, 0, 0)

      const times = []
      while (start <= end) {
        times.push(new Date(start))
        start.setMinutes(start.getMinutes() + 1)
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
      const timeObj = new Date()
      timeObj.setHours(...time.split(':').map(Number))

      const index = timestamps.value.findIndex(
        (t) => t.getHours() === timeObj.getHours() && t.getMinutes() === timeObj.getMinutes(),
      )

      if (index !== -1) {
        prices.value[index] = price
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
