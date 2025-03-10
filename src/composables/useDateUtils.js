export function useDateUtils() {
  const getToday = () => {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }

  const getYesterday = () => {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    return new Intl.DateTimeFormat('en-CA').format(yesterdayDate)
  }

  const isWeekday = (date) => {
    const day = date.getDay()
    return day !== 0 && day !== 6
  }

  const getLastTradingDay = () => {
    const today = new Date()
    let day = today.getDay()
    //sunday is 0
    if (day === 0)
      today.setDate(today.getDate() - 2) // If Sunday, go back to Friday
    else if (day === 1)
      today.setDate(today.getDate() - 3) // If Monday, go back to Friday
    else if (day === 6) today.setDate(today.getDate() - 1) // If Saturday, go back to Friday
    console.log('last trading day', today.toISOString().split('T')[0])
    return today.toISOString().split('T')[0]
  }

  return { getToday, getYesterday, isWeekday, getLastTradingDay }
}
