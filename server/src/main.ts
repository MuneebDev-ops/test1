import { createApp } from './http.ts'
import { TransactionControl } from './control.ts'

const port = Number(process.env.PORT ?? 4000)
const control = new TransactionControl()
control.openAccount('Avery Morgan', 2_000_000_00)
control.openAccount('Maya Chen', 2_000_000_00)

createApp(control).listen(port, () => {
  console.log(`Fraud control listening on ${port}`)
})
