<template>
  <div id="app" style="width: 100%; min-height: 500px">
    <!-- <p>📅 Yesterday's Data: {{ yesterdayData.length > 0 ? yesterdayData : 'No data' }}</p>
    <p>📅 Today's Data: {{ todayData.length > 0 ? todayData : 'No data' }}</p> -->
    <LineChart ref="myChart" v-bind="lineChartProps" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent, watch, onMounted, onUnmounted } from 'vue'
import stocksService from 'src/services/stocks.js'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'

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
    const { getToday, getYesterday } = useDateUtils()
    const lastUpdatedTime = ref(null)
    const formattedArray = ref([])

    const yesterdayData = ref([]) // Stores yesterday's data
    const todayData = ref([])

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
        startTime.setMinutes(startTime.getMinutes() + 1)
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
          display: false,
        },

        colors: {
          forceOverride: true,
        },
      },

      scales: {
        x: {
          grid: {
            display: false, // Remove X-axis grid lines
          },
          ticks: {
            callback: function (val, index) {
              return index % 12 === 0 ? this.getLabelForValue(val) : ''
            },
          },
        },
        y: {
          grid: {
            display: false, // Remove X-axis grid lines
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
    console.log('get todayy', getToday())
    console.log('get yesterday', getYesterday())

    onMounted(async () => {
      console.log('📡 Connecting WebSocket...')
      stocksService.connectWebSocket(props.stockSymbol, updateChart)

      //getting stock history
      const { yesterdayData: yData, todayData: tData } = await store.fetchStockHistory(
        props.stockSymbol,
      )

      console.log('yesterday after fetch', yesterdayData)
      console.log('todya after fetch', todayData)
      yesterdayData.value = yData
      todayData.value = tData
      if (yesterdayData.value.length > 0 && todayData.value.length > 0) {
        console.log('📊 today history', todayData.value)
        console.log('📊 yesterday data', yesterdayData.value)
        //get current time
        const now = new Date()
        //define market open and close times
        const startTime = new Date()
        startTime.setHours(9, 30, 0, 0) // set start time to 9:00 a.m.

        const endTime = new Date()
        endTime.setHours(16, 0, 0, 0) // set end time to 4:00 p.m.

        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0) // Ensures no timezone shift

        console.log('now now', now.toDateString())
        console.log('today now', todayDate.toDateString())

        if (now.toDateString() === todayDate.toDateString() && now >= startTime) {
          console.log("📅 Market is open today, showing today's data.")

          prices.value = [...todayData.value]
          lastUpdatedTime.value = todayData.value[0].x // Store last historical timestamp
          if (now === endTime) {
            store.closingPrice = todayData.value[0].y
          }
        } else {
          console.log(
            "📅 Market is not open yet or today is a non-trading day, showing yesterday's data.",
          )
          prices.value = [...yesterdayData.value]
          lastUpdatedTime.value = yesterdayData.value[0].x // Store last historical timestamp
          store.closingPrice = yesterdayData.value[0].y
          console.log('last updated price', yesterdayData.value[0].y)
          console.log('last updated price', store.closingPrice)
        }
      }
    })

    onUnmounted(() => {
      console.log('🛑 Disconnecting WebSocket...')
      stocksService.disconnectWebSocket()
    })

    watch(
      () => props.stockSymbol,
      async (newSymbol, oldSymbol) => {
        console.log(`🔄 Stock changed from ${oldSymbol} to ${newSymbol}, reconnecting WebSocket...`)

        // ✅ Disconnect old WebSocket before fetching new stock data
        stocksService.disconnectWebSocket()

        // ✅ Fetch new stock history
        const { yesterdayData, todayData } = await store.fetchStockHistory(newSymbol)

        console.log('yesterday after fetch', yesterdayData)
        console.log('todya after fetch', todayData)
        // ✅ Update the chart with new stock data
        if (todayData.length > 0) {
          prices.value = [...todayData] // ✅ Use today's data
          lastUpdatedTime.value = todayData[0].x
        } else {
          prices.value = [...yesterdayData] // ✅ Fallback to yesterday's data
          lastUpdatedTime.value = yesterdayData[0]?.x || null
        }

        // ✅ Force Vue to recognize `options.value` update
        console.log('📡 Chart is updating, applying new tick settings...')
        options.value = { ...options.value } // ✅ Triggers Vue reactivity

        // ✅ Ensure `ticks.callback` is reapplied
        options.value.scales.x.ticks.callback = function (val, index) {
          return index % 12 === 0 ? this.getLabelForValue(val) : ''
        }

        // ✅ Reconnect WebSocket for the new stock
        stocksService.connectWebSocket(props.stockSymbol, updateChart)
      },
    )

    // watch(chartData, () => {
    //   myChart.data.datasets[0].data = chartData.value
    //   myChart.update()
    // })
    // watch(
    //   () => prices.value, // Watching specific stock data
    //   (newData) => {
    //     if (newData) {
    //       if (store.closingPrice >= newData) {
    //         console.log(`the price ${newData} is lower than closing ${store.closingPrice}`)
    //       } else {
    //         console.log(`the price ${newData} is higher than closing ${store.closingPrice}`)
    //       }
    //     }
    //   },
    //   { deep: true, immediate: true }, // Ensures it runs on first load and deep watches objects
    // )
    // console.log('chartdata', typeof chartData.value.datasets.borderColor)

    return { lineChartProps, lineChartRef, store, formattedArray }
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
