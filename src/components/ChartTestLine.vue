<template>
  <div id="app" style="width: 100%">
    <!-- {{ selectedStockHistory }} -->
    <LineChart v-bind="lineChartProps" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent, watch, onMounted, onUnmounted } from 'vue'
import stocksService from 'src/services/stocks.js'
import { useStockStore } from 'src/stores/store'
Chart.register(...registerables)

export default defineComponent({
  name: 'App',
  components: {
    LineChart,
  },
  props: {
    stockSymbol: String,
  },
  setup(props) {
    const store = useStockStore()
    const lastUpdatedTime = ref(null)
    const formattedArray = ref([])
    const selectedStockHistory = ref([])

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
    // console.log('time labels', timestamps.value)

    // chart setup
    const chartData = computed(() => ({
      labels: timestamps.value,

      datasets: [
        {
          data: selectedStockHistory.value,
          backgroundColor: ['#77CEFF'],
        },
      ],
    }))

    const options = ref({
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Chart.js Line Chart',
        },
      },
      scales: {
        x: {
          ticks: {
            callback: function (val, index) {
              return index % 10 === 0 ? this.getLabelForValue(val) : ''
            },
          },
        },
        y: {
          display: true,
          beginAtZero: false,

          ticks: {},
        },
      },
    })

    const { lineChartProps, lineChartRef } = useLineChart({
      chartData,
      options,
    })
    const prices = ref(Array(timestamps.value.length).fill(null))

    const updateChart = (price, time) => {
      console.log('price', price)
      console.log('time', time)
      const startTime = new Date(new Date().setHours(9, 30, 0, 0))
      const endTime = new Date(new Date().setHours(16, 0, 0, 0))

      console.log('startTime', startTime)
      console.log('startTime', endTime)

      if (time >= startTime && time <= endTime) {
        const currentMinute = time
        if (
          lastUpdatedTime.value == null ||
          (currentMinute !== lastUpdatedTime.value + 1 && lastUpdatedTime.value !== currentMinute)
        ) {
          prices.value.push({ x: time, y: price }) // ✅ Add new data point dynamically
          prices.value = [...prices.value]
          lastUpdatedTime.value = currentMinute
          console.log('prices', prices.value)
        } else {
          console.log(`⏳ Ignoring duplicate update for ${time}`)
        }
      } else {
        console.warn(`⚠️ Ignored timestamp (${time}), outside of X-axis range`)
      }
    }

    onMounted(async () => {
      console.log('📡 Connecting WebSocket...')
      stocksService.connectWebSocket(props.stockSymbol, updateChart)

      //getting stock history
      selectedStockHistory.value = await store.fetchStockHistory(props.stockSymbol)
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

    return { lineChartProps, selectedStockHistory, lineChartRef, store, formattedArray }
  },
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
