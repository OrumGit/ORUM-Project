// Resumen de una conciliación: cuántas cuotas se aplicaron ahora y cuántas ya
// estaban aplicadas. Puro, para poder probarlo sin base de datos ni red.

/** Qué pasó con una cuota al conciliarla. */
export type ResultadoCuota =
  | 'aplicada' // cobro nuevo: se registró y, si era el primero, se activó la membresía
  | 'ya_estaba' // su pago ya tenía membresía asociada: no se toca nada
  | 'en_espera' // Mercado Pago todavía no decide el cobro
  | 'rechazada' // cobro rechazado: se abrió la gracia
  | 'sin_pago' // la cuota todavía no tiene pago asociado
  | 'no_aplicable' // no se puede aplicar (suscripción desconocida, pago incompleto…)

export type ResumenConciliacion = {
  revisadas: number
  aplicadas: number
  yaEstaban: number
  enEspera: number
  rechazadas: number
  sinPago: number
  noAplicables: number
}

export function resumirConciliacion(resultados: readonly ResultadoCuota[]): ResumenConciliacion {
  const resumen: ResumenConciliacion = {
    revisadas: resultados.length,
    aplicadas: 0,
    yaEstaban: 0,
    enEspera: 0,
    rechazadas: 0,
    sinPago: 0,
    noAplicables: 0,
  }
  for (const r of resultados) {
    switch (r) {
      case 'aplicada':
        resumen.aplicadas++
        break
      case 'ya_estaba':
        resumen.yaEstaban++
        break
      case 'en_espera':
        resumen.enEspera++
        break
      case 'rechazada':
        resumen.rechazadas++
        break
      case 'sin_pago':
        resumen.sinPago++
        break
      case 'no_aplicable':
        resumen.noAplicables++
        break
    }
  }
  return resumen
}

/** Suma varios resúmenes (una suscripción por resumen). */
export function sumarResumenes(resumenes: readonly ResumenConciliacion[]): ResumenConciliacion {
  const total: ResumenConciliacion = {
    revisadas: 0,
    aplicadas: 0,
    yaEstaban: 0,
    enEspera: 0,
    rechazadas: 0,
    sinPago: 0,
    noAplicables: 0,
  }
  for (const r of resumenes) {
    total.revisadas += r.revisadas
    total.aplicadas += r.aplicadas
    total.yaEstaban += r.yaEstaban
    total.enEspera += r.enEspera
    total.rechazadas += r.rechazadas
    total.sinPago += r.sinPago
    total.noAplicables += r.noAplicables
  }
  return total
}
