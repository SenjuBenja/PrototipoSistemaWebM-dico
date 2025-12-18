using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    public static class DashboardEndpoints
    {
        public static RouteGroupBuilder MapDashboard(this RouteGroupBuilder group)
        {

            // GET /api/dashboard/summary
            group.MapGet("/summary", async (ClinicaContext db) =>
            {
                // Semana actual (lunes a domingo)
                var today = DateTime.Today;
                var delta = ((int)today.DayOfWeek + 6) % 7; // lunes=0
                var weekStart = today.AddDays(-delta);
                var weekEnd = weekStart.AddDays(7); // exclusivo

                // Últimos 7 días
                var last7 = today.AddDays(-7);

                // Citas de la semana (y top 5 para listar)
                var citasSemanaQry = db.Set<Citum>()
                    .Include(c => c.Paciente)
                    .Where(c => c.CitaFecha >= weekStart && c.CitaFecha < weekEnd)
                    .AsNoTracking();

                var citasSemanaCount = await citasSemanaQry.CountAsync();
                var citasSemanaTop = await citasSemanaQry
                    .OrderBy(c => c.CitaFecha)
                    .Take(5)
                    .Select(c => new {
                        c.CitaId,
                        c.CitaFecha,
                        c.CitaModalidad,
                        PacienteId = c.Paciente.PacienteId,
                        c.Paciente.PacienteCedula,
                        c.Paciente.PacienteNombre,
                        c.Paciente.PacienteApellido
                    })
                    .ToListAsync();

                // Informes recientes (últimos 7 días)
                var informesRecientes = await db.Set<Informe>()
                    .Where(i => i.InformeFecha >= last7)
                    .CountAsync();

                // Pacientes nuevos (requiere columna fecha de registro)
                // Si no existe, devuelvo 0
                int pacientesNuevos = 0;
                var pacienteFechaReg = db.Model.FindEntityType(typeof(Paciente))?
                    .FindProperty("PacienteFechaRegistro");
                if (pacienteFechaReg != null)
                {
                    pacientesNuevos = await db.Pacientes
                        .Where(p => EF.Property<DateTime>(p, "PacienteFechaRegistro") >= last7)
                        .CountAsync();
                }

                return Results.Ok(new
                {
                    semanaInicio = weekStart,
                    semanaFin = weekEnd.AddDays(-1),
                    citasSemana = citasSemanaCount,
                    citasSemanaTop,
                    informesRecientes = informesRecientes,
                    pacientesNuevos = pacientesNuevos
                });
            });

            return group;
        }

    }
}
