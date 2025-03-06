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
    stockExchange: String,
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

        // Increment the startTime by 5 minute
        startTime.setMinutes(startTime.getMinutes() + 5)
      }

      return times
    }

    const timestamps = ref(generateTimeLabels())

    // chart setup
    const chartData = computed(() => ({
      labels: timestamps.value,

      datasets: [
        {
          data: prices.value,
          backgroundColor: ['#4caf50'],
          borderColor: ['#4caf50'],
          pointRadius: 0,
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
          grid: {
            display: false, // ✅ Remove X-axis grid lines
          },
          ticks: {
            callback: function (val, index) {
              return index % 12 === 0 ? this.getLabelForValue(val) : ''
            },
          },
        },
        y: {
          grid: {
            display: false, // ✅ Remove X-axis grid lines
          },
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
    const prices = ref([])

    console.log('prices with hisotry added', prices)
    console.log('prices empty', prices)

    const minutePriceAdded = new Set() //tracks which minutes have been added

    const updateChart = (price, time) => {
      console.log('price', price)

      const currentMinute = time
      const hasMinute = timestamps.value.includes(currentMinute)
      if (hasMinute && !minutePriceAdded.has(currentMinute)) {
        prices.value = [{ x: time, y: price }, ...prices.value]
        minutePriceAdded.add(currentMinute) //Store the minute as processed
        console.log('Added first price for', currentMinute)
      } else {
        console.log(`⏳ Ignoring duplicate update for ${currentMinute}`)
      }
    }

    onMounted(async () => {
      console.log('📡 Connecting WebSocket...')
      stocksService.connectWebSocket(props.stockSymbol, updateChart)

      //getting stock history
      const historyData = await store.fetchStockHistory(props.stockSymbol)
      if (historyData.length > 0) {
        // selectedStockHistory.value = [...historyData]
        prices.value = [...historyData]
        lastUpdatedTime.value = historyData[0].x // ✅ Store last historical timestamp
      }
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
