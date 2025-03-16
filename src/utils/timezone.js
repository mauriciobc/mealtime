// Remote Imports
const momentTimezone = require('moment-timezone')

// Hoisted Variables
const TIMEZONES = momentTimezone.tz.names()

// Utility Functions
const isValidTimezone = timezone => TIMEZONES.includes(timezone)

const getTimezones = () => {
  // Retorna um objeto com timezones agrupadas por região
  const timezoneGroups = {}
  
  TIMEZONES.forEach(timezone => {
    const parts = timezone.split('/')
    const region = parts[0]
    
    if (!timezoneGroups[region]) {
      timezoneGroups[region] = []
    }
    
    timezoneGroups[region].push(timezone)
  })
  
  return timezoneGroups
}

const getAllTimezones = () => TIMEZONES

// Exports
module.exports = {
  isValidTimezone,
  getTimezones,
  getAllTimezones
} 