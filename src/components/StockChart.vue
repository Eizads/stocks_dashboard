<template>
  <div id="myChart" style="width: 100%; min-height: 500px; margin-top: 0.5rem">
    <LineChart ref="lineRef" v-bind="lineChartProps" @chart:update="handleChartUpdate" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent, watch, onMounted, onUnmounted } from 'vue'
import stocksService from 'src/services/stocks.js'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'
import { LocalStorage } from 'quasar'

Chart.register(...registerables)

export default defineComponent({
  name: 'StockChart',
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
    const borderColor = ref(['#21ba45'])
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
          backgroundColor: borderColor.value,
          borderColor: borderColor.value,
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
            callback: function (val) {
              // return index % 12 === 0 ? this.getLabelForValue(val) : ''
              const label = this.getLabelForValue(val)
              const date = new Date(label) // Convert timestamp to Date object

              if (date.getMinutes() === 0) {
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }) // Format as "1 AM", "2 AM", etc.
              }
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

    const handleChartUpdate = (chart) => {
      console.log('chart updating', chart)
      // options.value.scales.x.ticks.callback = function (val, index) {
      //   return index % 12 === 0 ? this.getLabelForValue(val) : ''
      // }
      console.log('now price xx', prices.value[0].y)
      console.log('closing price xx', store.closingPrice)
      if (!chart) return

      borderColor.value = prices.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'
      borderColor.value = prices.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'

      chart.options.scales.x.ticks.callback = function (val, index) {
        return index % 12 === 0 ? this.getLabelForValue(val) : ''
      }

      chart.update() // ✅ Apply the change
    }
    // const handleChartRender = (chart) => {
    //   if (!chart) return
    //   console.log('chart rendering', chart)
    //   // ✅ Ensure todayData is available before accessing .value
    //   if (!todayData.value || todayData.value.length === 0) {
    //     chart.data.datasets[0].borderColor = '#21ba45'

    //     console.warn('⚠️ todayData is empty or not loaded yet!')
    //     return
    //   }
    //   console.log('closing price xx', store.closingPrice)

    //   console.log('now price xx', todayData.value)
    //   chart.data.datasets[0].borderColor =
    //     todayData.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'
    //   chart.data.datasets[0].backgroundColor =
    //     todayData.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'
    //   chart.update() // ✅ Apply the change
    // }

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
        console.log('now---------------', now.getTime())
        console.log('endTime---------------', endTime.getTime())
        console.log('now now', now.toDateString())
        console.log('today now', todayDate.toDateString())

        if (now.toDateString() === todayDate.toDateString() && now >= startTime) {
          console.log("📅 Market is open today, showing today's data.")

          prices.value = [...todayData.value]
          lastUpdatedTime.value = todayData.value[0].x // Store last historical timestamp
          if (now.getTime() >= endTime.getTime()) {
            store.closingPrice = todayData.value[0].y
            store.setClosingPrice(todayData.value[0]?.y) // ✅ Update closing price
          } else {
            store.closingPrice = yesterdayData.value[0].y
            store.setClosingPrice(yesterdayData.value[0]?.y) // ✅ Update closing price

            console.log('closing price from yesterday', store.closingPrice)
          }
          // lineRef.value.chart.data.datasets[0].borderColor =
          //   prices.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'
          // lineRef.value.chart.update()
          // handleChartRender()
        } else {
          console.log(
            "📅 Market is not open yet or today is a non-trading day, showing yesterday's data.",
          )
          prices.value = [...yesterdayData.value]
          lastUpdatedTime.value = yesterdayData.value[0].x // Store last historical timestamp
          store.closingPrice = yesterdayData.value[0].y
          LocalStorage.set('closingPrice', store.closingPrice)

          console.log('last updated price', yesterdayData.value[0].y)
          console.log('last updated price', store.closingPrice)
          // lineRef.value.chart.data.datasets[0].borderColor =
          //   prices.value[0].y >= store.closingPrice ? '#21ba45' : '#ea4335'
          // lineRef.value.chart.update()
          // handleChartRender()
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
        const now = new Date()
        const startTime = new Date()
        startTime.setHours(9, 30, 0, 0)
        const endTime = new Date()
        endTime.setHours(16, 0, 0, 0)

        if (todayData.length > 0) {
          prices.value = [...todayData] // ✅ Use today's data
          lastUpdatedTime.value = todayData[0].x

          if (now.getTime() >= endTime.getTime()) {
            store.setClosingPrice(todayData[todayData.length - 1]?.y) // ✅ Update closing price
          } else {
            store.setClosingPrice(yesterdayData[yesterdayData.length - 1]?.y) // ✅ Use last available price
          }
        } else {
          prices.value = [...yesterdayData] // ✅ Fallback to yesterday's data
          lastUpdatedTime.value = yesterdayData[0]?.x || null
          store.setClosingPrice(yesterdayData[yesterdayData.length - 1]?.y) // ✅ Use last available price
        }

        console.log('Updated closing price:', store.closingPrice)

        // ✅ Force Vue to recognize `options.value` update
        console.log('📡 Chart is updating, applying new tick settings...')
        options.value = { ...options.value } // ✅ Triggers Vue reactivity

        // ✅ Ensure `ticks.callback` is reapplied
        // options.value.scales.x.ticks.callback = function (val, index) {
        //   return index % 12 === 0 ? this.getLabelForValue(val) : ''
        // }

        // ✅ Reconnect WebSocket for the new stock
        stocksService.connectWebSocket(props.stockSymbol, updateChart)
      },
    )

    return {
      lineChartProps,
      lineChartRef,
      store,
      formattedArray,
      handleChartUpdate,
      // handleChartRender,
    }
  },
})
</script>

<style>
#myChart {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#line-chart {
  min-height: 500px !important;
}
</style>
