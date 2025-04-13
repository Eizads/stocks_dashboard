export function useDateUtils() {
  const getToday = () => {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }

  const getYesterday = () => {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    return new Intl.DateTimeFormat('en-CA').format(yesterdayDate)
  }

  const getDayBeforeYesterday = () => {
    const dayBeforeYesterdayDate = new Date()
    dayBeforeYesterdayDate.setDate(dayBeforeYesterdayDate.getDate() - 2)
    return new Intl.DateTimeFormat('en-CA').format(dayBeforeYesterdayDate)
  }

  const isWeekday = (date) => {
    const day = date.getDay()
    return day !== 0 && day !== 6
  }

  const getLastTradingDay = () => {
    const today = new Date()
    let day = today.getDay()
    if (day === 0) {
      today.setDate(today.getDate() - 2) // If Sunday, go back to Friday
    } else if (day === 1) {
      today.setDate(today.getDate() - 3) // If Monday, go back to Friday
    } else if (day === 6) {
      today.setDate(today.getDate() - 1) // If Saturday, go back to Friday
    }
    return new Intl.DateTimeFormat('en-CA').format(today)
  }

  const getMarketTimes = () => {
    const now = new Date()
    const startTime = new Date(now)
    startTime.setHours(9, 30, 0, 0) // Market opens at 9:30 AM

    const endTime = new Date(now)
    endTime.setHours(16, 0, 0, 0) // Market closes at 4:00 PM

    return {
      now: now.getTime(),
      start: startTime.getTime(),
      end: endTime.getTime(),
    }
  }

  const marketOpen = () => {
    const { now, start, end } = getMarketTimes()
    return now >= start && now <= end && isWeekday(new Date())
  }

  const beforeMarket = () => {
    const { now, start } = getMarketTimes()
    return now < start && isWeekday(new Date())
  }

  const afterMarket = () => {
    const { now, end } = getMarketTimes()
    return now > end && isWeekday(new Date())
  }

  const formatTimeToMarketHours = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const roundToNearestFiveMinutes = (date) => {
    const coeff = 1000 * 60 * 5
    return new Date(Math.round(date.getTime() / coeff) * coeff)
  }

  const isMarketHours = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return (
      (hours === 9 && minutes >= 30) || (hours > 9 && hours < 16) || (hours === 16 && minutes === 0)
    )
  }

  return {
    getToday,
    getYesterday,
    getDayBeforeYesterday,
    isWeekday,
    getLastTradingDay,
    marketOpen,
    beforeMarket,
    afterMarket,
    formatTimeToMarketHours,
    roundToNearestFiveMinutes,
    isMarketHours,
  }
}
