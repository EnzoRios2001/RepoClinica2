import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ypgfwzuctctjsjvcqpei.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZ2Z3enVjdGN0anNqdmNxcGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MTQ3MTIsImV4cCI6MjA2MTM5MDcxMn0.t5WYlQ8Ip49mZKZphEYnuhI5LudxsTCf4nYvBZHNgt8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function registrarCambioEstado(turnos, nuevoEstado) {
    if (!turnos || turnos.length === 0) return;

    const registros = turnos.map(turno => ({
        id_turno: turno.id,
        estado_nuevo: nuevoEstado,
        cambiado_por: '1'
    }));

    const { error } = await supabase
        .from('estado_solicitudes_turno')
        .insert(registros);

    if (error) {
        console.error(`Error al registrar cambios de estado a ${nuevoEstado}:`, error);
    }
}

async function actualizarEstadoTurnos() {
    try {
        const fechaActual = new Date().toISOString();
        
        // Actualizar turnos confirmados a completados
        const { data: turnosCompletados, error: errorCompletados } = await supabase
            .from('solicitudes_turno')
            .update({ estado: 'completado' })
            .eq('estado', 'confirmado')
            .lt('fecha_turno', fechaActual)
            .select();

        if (errorCompletados) {
            console.error('Error al actualizar los turnos completados:', errorCompletados);
            return;
        }

        // Registrar cambios de estado a completado
        await registrarCambioEstado(turnosCompletados, 'completado');

        // Actualizar turnos pendientes vencidos a rechazados
        const { data: turnosRechazados, error: errorRechazados } = await supabase
            .from('solicitudes_turno')
            .update({ estado: 'rechazado' })
            .eq('estado', 'pendiente')
            .lt('fecha_turno', fechaActual)
            .select();

        if (errorRechazados) {
            console.error('Error al actualizar los turnos rechazados:', errorRechazados);
            return;
        }

        // Registrar cambios de estado a rechazado
        await registrarCambioEstado(turnosRechazados, 'rechazado');

        console.log(`Se actualizaron ${turnosCompletados.length} turnos a estado completado`);
        console.log(`Se actualizaron ${turnosRechazados.length} turnos pendientes vencidos a estado rechazado`);
    } catch (error) {
        console.error('Error en la actualización automática:', error);
    }
}

// Función principal que ejecuta la actualización
async function main() {
    console.log('Iniciando servicio de actualización de turnos...');
    
    // Ejecutar inmediatamente la primera vez
    await actualizarEstadoTurnos();
    
    // Configurar la ejecución cada 24 horas
    setInterval(actualizarEstadoTurnos, 24 * 60 * 60 * 1000);
}

// Iniciar el servicio
main().catch(console.error); 