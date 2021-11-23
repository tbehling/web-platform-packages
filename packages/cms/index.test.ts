import rivet from '.'
import config from './config'

test('configuration is passed into rivet correctly', () => {
  expect(rivet.client.url).toBe(config.url)
  expect(rivet.client.options.headers['Authorization']).toBe(
    config.headers['Authorization']
  )
  expect(rivet.client.options.cors).toBe(true)
})