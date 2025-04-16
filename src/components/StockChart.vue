<template>
  <div id="myChart" style="width: 100%; min-height: 400px; margin-top: 1rem">
    <LineChart ref="lineRef" v-bind="lineChartProps" @chart:update="handleChartUpdate" />
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import { LineChart, useLineChart } from 'vue-chart-3'
import { ref, computed, defineComponent, watch, onMounted, onUnmounted } from 'vue'
import { useStockStore } from 'src/stores/store'
import { useDateUtils } from 'src/composables/useDateUtils'
import annotationPlugin from 'chartjs-plugin-annotation'

Chart.register(...registerables)
Chart.register(annotationPlugin)

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
    const { marketOpen, beforeMarket, afterMarket } = useDateUtils()
    const lastUpdatedTime = ref(null)
    const formattedArray = ref([])
    const borderColor = ref(['#21ba45'])
    const yesterdayData = ref([])
    const todayData = ref([])
    const dayBeforeYesterdayData = ref([])
    const marketOpenTimer = ref(null)

    const generateTimeLabels = () => {
      const times = []

      const startTime = new Date()
      startTime.setHours(9, 30, 0, 0) // set start time to 9:30 a.m.

      const endTime = new Date()
      endTime.setHours(16, 0, 0, 0) // set end time to 4:00 p.m.

      while (startTime <= endTime) {
        const label = startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        times.push(label)

        // Increment by 1 minute to match the new interval
        startTime.setMinutes(startTime.getMinutes() + 1)
      }

      return times
    }

    const timestamps = ref(generateTimeLabels())

    const prices = ref([])

    console.log('prices with hisotry added', prices)
    console.log('prices empty', prices)

    const minutePriceAdded = new Set() //tracks which minutes have been added

    const updateChart = async (price, time) => {
      console.log('Received live price update:', price, 'at time:', time)

      const currentMinute = time
      const hasMinute = timestamps.value.includes(currentMinute)

      if (hasMinute && !minutePriceAdded.has(currentMinute)) {
        // Format the new price point
        const newPricePoint = { x: time, y: parseFloat(price) }

        // Add to the end of the array to maintain chronological order
        prices.value = [...prices.value, newPricePoint]
        minutePriceAdded.add(currentMinute)

        // Update color without triggering chart update
        const newColor = parseFloat(price) >= store.previousClosingPrice ? '#21ba45' : '#ea4335'
        if (borderColor.value[0] !== newColor) {
          borderColor.value = [newColor]
        }

        console.log('Added new price point:', newPricePoint)
      } else {
        console.log(`⏳ Ignoring duplicate update for ${currentMinute}`)
      }
    }

    const handleChartUpdate = (chart) => {
      if (!chart || !prices.value.length) return

      // Only update if color needs to change
      const currentPrice = prices.value[prices.value.length - 1]?.y
      const newColor = currentPrice >= store.previousClosingPrice ? '#21ba45' : '#ea4335'

      if (borderColor.value[0] !== newColor) {
        borderColor.value = [newColor]

        // Update chart options without triggering data updates
        chart.data.datasets[0].borderColor = borderColor.value
        chart.data.datasets[0].backgroundColor = borderColor.value
      }

      // Only call update once at the end
      chart.update('none') // Use 'none' mode to skip animations
    }

    const initializeChartData = async () => {
      try {
        // Fetch initial stock data
        const stockData = await store.fetchStockInteraday(props.stockSymbol)
        const quoteResponse = await store.getStockQuote(props.stockSymbol)

        console.log('📊 Fetched stock data:', {
          today: stockData.todayData?.length,
          yesterday: stockData.yesterdayData?.length,
          dayBeforeYesterday: stockData.dayBeforeYesterdayData?.length,
          dates: stockData.dates,
          quote: quoteResponse,
        })

        // Store the data in refs - preserve API data order
        todayData.value = stockData.todayData || []
        yesterdayData.value = stockData.yesterdayData || []
        dayBeforeYesterdayData.value = stockData.dayBeforeYesterdayData || []

        const now = new Date()
        const dayOfWeek = now.getDay() // 0 is Sunday, 6 is Saturday

        // Helper function to get closing price from data array
        const getClosingPrice = (data) => {
          if (!data || data.length === 0) return null
          // Sort by time to get the last entry of the day (4:00 PM)
          const sortedData = [...data].sort(
            (a, b) => new Date('1970/01/01 ' + b.x) - new Date('1970/01/01 ' + a.x),
          )
          const lastEntry = sortedData.find((entry) => entry.x.includes('4:00'))
          return lastEntry ? lastEntry.y : sortedData[0]?.y
        }

        // Get closing prices from quote response if available
        const quoteClose = quoteResponse?.close ? parseFloat(quoteResponse.close) : null
        const quotePreviousClose = quoteResponse?.previous_close
          ? parseFloat(quoteResponse.previous_close)
          : null

        // Log the actual dates and closing prices we're working with
        console.log('📅 Working with dates and prices:', {
          today: {
            date: stockData.dates?.today,
            close: quoteClose || getClosingPrice(todayData.value),
          },
          yesterday: {
            date: stockData.dates?.yesterday,
            close: quotePreviousClose || getClosingPrice(yesterdayData.value),
          },
          dayBeforeYesterday: {
            date: stockData.dates?.dayBeforeYesterday,
            close: getClosingPrice(dayBeforeYesterdayData.value),
          },
        })

        // Determine which data to display and set closing price based on market timing and day of week
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend
          console.log('📅 Weekend: showing most recent data')
          prices.value = [...todayData.value]
          if (quoteClose) {
            store.setClosingPrice(quoteClose)
            store.setPreviousClosingPrice(quotePreviousClose)
          } else {
            const lastClose = getClosingPrice(todayData.value)
            const previousClose = getClosingPrice(yesterdayData.value)
            if (lastClose) store.setClosingPrice(lastClose)
            if (previousClose) store.setPreviousClosingPrice(previousClose)
          }
        } else if (dayOfWeek === 1 && beforeMarket()) {
          // Monday before market open
          console.log('📅 Monday before market: showing Friday data')
          prices.value = [...yesterdayData.value]
          if (quotePreviousClose) {
            store.setClosingPrice(quotePreviousClose)
            const thursdayClose = getClosingPrice(dayBeforeYesterdayData.value)
            if (thursdayClose) store.setPreviousClosingPrice(thursdayClose)
          } else {
            const fridayClose = getClosingPrice(yesterdayData.value)
            const thursdayClose = getClosingPrice(dayBeforeYesterdayData.value)
            if (fridayClose) store.setClosingPrice(fridayClose)
            if (thursdayClose) store.setPreviousClosingPrice(thursdayClose)
          }
        } else if (marketOpen()) {
          console.log("📈 Market is open, showing today's data")
          prices.value = [...todayData.value]
          if (quotePreviousClose) {
            store.setClosingPrice(quotePreviousClose)
            store.setPreviousClosingPrice(quotePreviousClose)
          } else {
            const yesterdayClose = getClosingPrice(yesterdayData.value)
            if (yesterdayClose) {
              store.setClosingPrice(yesterdayClose)
              store.setPreviousClosingPrice(yesterdayClose)
            }
          }
        } else if (beforeMarket()) {
          console.log("🌅 Pre-market, showing yesterday's data")
          prices.value = [...todayData.value]
          if (quoteClose) {
            console.log('before market quoteClose', quoteClose)
            store.closingPrice = quoteClose
            store.setClosingPrice(quoteClose)
          }
        } else if (afterMarket()) {
          console.log("🌆 After-market, showing today's data")
          prices.value = [...todayData.value]
          if (quoteClose) {
            store.setClosingPrice(quoteClose)
            store.setPreviousClosingPrice(quotePreviousClose)
          } else {
            const todayClose = getClosingPrice(todayData.value)
            const yesterdayClose = getClosingPrice(yesterdayData.value)
            if (todayClose) store.setClosingPrice(todayClose)
            if (yesterdayClose) store.setPreviousClosingPrice(yesterdayClose)
          }
        }

        // Update last updated time
        lastUpdatedTime.value = prices.value[prices.value.length - 1]?.x || null

        // Set initial chart color
        if (prices.value.length > 0 && store.previousClosingPrice) {
          const currentPrice = prices.value[prices.value.length - 1]?.y
          borderColor.value = [currentPrice >= store.previousClosingPrice ? '#21ba45' : '#ea4335']
        }

        console.log('Chart initialized with:', {
          dayOfWeek,
          marketStatus: marketOpen()
            ? 'open'
            : beforeMarket()
              ? 'pre-market'
              : afterMarket()
                ? 'after-market'
                : 'closed',
          dataPoints: prices.value.length,
          closingPrice: store.closingPrice,
          previousClosingPrice: store.previousClosingPrice,
          lastUpdate: lastUpdatedTime.value,
        })
      } catch (error) {
        console.error('❌ Error initializing chart data:', error)
        prices.value = []
        lastUpdatedTime.value = null
      }
    }

    // Computed property for chart data to reduce reactivity overhead
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

    // Options as a computed property to reduce reactivity overhead
    const chartOptions = computed(() => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 0,
      },
      plugins: {
        legend: {
          display: false,
        },
        colors: {
          forceOverride: true,
        },
        annotation: {
          annotations: {
            previousClose: {
              type: 'line',
              yMin: store.previousClosingPrice,
              yMax: store.previousClosingPrice,
              borderColor: '#666666',
              borderWidth: 1.5,
              borderDash: [5, 5],
              drawTime: 'beforeDatasetsDraw',
              label: {
                display: true,
                content: [
                  'Previous',
                  'Close',
                  `${store.previousClosingPrice?.toFixed(2) || '0.00'}`,
                ],
                position: 'end',
                backgroundColor: 'white',
                color: '#757575',
                padding: 6,
                font: {
                  size: 12,
                  weight: 'bold',
                  lineHeight: 1.2,
                },
                xAdjust: 10,
                yAdjust: -6,
              },
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 12,
            minRotation: 0,
            maxRotation: 0,
            callback: function (value) {
              const xAxis = this.chart.scales['x']
              const label = xAxis.getLabelForValue(value)
              // Only show hour and minute
              const time = new Date(`1970/01/01 ${label}`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
              return time
            },
            font: {
              size: 11,
            },
          },
          grid: {
            display: true,
            drawOnChartArea: false,
          },
        },
        y: {
          grid: {
            display: false,
          },
          display: true,
          beginAtZero: false,
          ticks: {},
        },
      },
    }))

    const { lineChartProps, lineChartRef } = useLineChart({
      chartData,
      options: chartOptions,
    })

    const setupMarketOpenTimer = () => {
      // Clear any existing timer first
      if (marketOpenTimer.value) {
        clearTimeout(marketOpenTimer.value)
      }

      const now = new Date()
      const startTime = new Date()
      startTime.setHours(9, 30, 0, 0)
      const endTime = new Date()
      endTime.setHours(16, 0, 0, 0)
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      // If we're before market open, set up a timer to fetch data when market opens
      if (now.toDateString() === todayDate.toDateString() && now < startTime) {
        const timeUntilMarketOpen = startTime.getTime() - now.getTime()
        console.log(`⏰ Market opens in ${Math.round(timeUntilMarketOpen / 1000 / 60)} minutes`)

        marketOpenTimer.value = setTimeout(async () => {
          console.log('🕒 Market just opened, fetching new data...')
          const { todayData: newTodayData } = await store.fetchStockHistory(props.stockSymbol)
          const quoteResponse = await store.getStockQuote(props.stockSymbol)

          if (newTodayData.length > 0) {
            prices.value = [...newTodayData]
            lastUpdatedTime.value = newTodayData[0].x

            // Use quote response for closing price if available
            if (quoteResponse?.previous_close) {
              const previousClose = parseFloat(quoteResponse.previous_close)
              store.setClosingPrice(previousClose)
              store.setPreviousClosingPrice(previousClose)
            } else {
              store.setClosingPrice(yesterdayData.value[0]?.y)
              store.setPreviousClosingPrice(yesterdayData.value[0]?.y)
            }

            console.log('📊 Updated chart with market open data')
          }
        }, timeUntilMarketOpen)
      }
    }

    onMounted(async () => {
      await initializeChartData()
      console.log('📡 Connecting WebSocket...')
      store.connectToWebSocket(props.stockSymbol, updateChart)
      setupMarketOpenTimer()
    })

    onUnmounted(() => {
      console.log('🛑 Disconnecting WebSocket...')
      store.disconnectWebSocket()
      // Clear the market open timer if it exists
      if (marketOpenTimer.value) {
        clearTimeout(marketOpenTimer.value)
        console.log('🛑 Cleared market open timer')
      }
    })

    watch(
      () => props.stockSymbol,
      async (newSymbol) => {
        console.log(`🔄 Stock changed to ${newSymbol}, updating chart...`)
        store.disconnectWebSocket()
        await initializeChartData()
        store.connectToWebSocket(newSymbol, updateChart)
        setupMarketOpenTimer()
      },
    )

    return {
      lineChartProps,
      lineChartRef,
      store,
      formattedArray,
      handleChartUpdate,
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
  min-height: 400px !important;
}
</style>
