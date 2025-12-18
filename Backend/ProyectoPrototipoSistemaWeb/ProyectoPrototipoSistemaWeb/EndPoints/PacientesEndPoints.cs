using Microsoft.EntityFrameworkCore;
using ProyectoPrototipoSistemaWeb.Data;

namespace ProyectoPrototipoSistemaWeb.Endpoints
{
    public static class PacientesEndpoints
    {
        public static RouteGroupBuilder MapPacientes(this RouteGroupBuilder group)
        {
            // ========== CRUD ==========
            group.MapGet("/", async (ClinicaContext db) =>
                await db.Pacientes.AsNoTracking().ToListAsync());

            group.MapGet("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Paciente))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Pacientes
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                return entity is null ? Results.NotFound() : Results.Ok(entity);
            });

            group.MapPost("/", async (Paciente dto, ClinicaContext db) =>
            {
                db.Pacientes.Add(dto);
                await db.SaveChangesAsync();
                var key = db.Model.FindEntityType(typeof(Paciente))!.FindPrimaryKey()!.Properties[0].Name;
                var idVal = dto.GetType().GetProperty(key)!.GetValue(dto)?.ToString();
                return Results.Created($"/api/pacientes/{idVal}", dto);
            });

            group.MapPut("/{id}", async (string id, Paciente input, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Paciente))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Pacientes
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                if (entity is null) return Results.NotFound();

                var pk = entity.GetType().GetProperty(key)!.GetValue(entity);
                db.Entry(entity).CurrentValues.SetValues(input);
                entity.GetType().GetProperty(key)!.SetValue(entity, pk);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            group.MapDelete("/{id}", async (string id, ClinicaContext db) =>
            {
                var key = db.Model.FindEntityType(typeof(Paciente))!.FindPrimaryKey()!.Properties[0].Name;
                var entity = await db.Pacientes
                    .FirstOrDefaultAsync(e => EF.Property<object>(e, key)!.ToString() == id);
                if (entity is null) return Results.NotFound();
                db.Pacientes.Remove(entity);
                await db.SaveChangesAsync();
                return Results.NoContent();
            });

            // ========== BÚSQUEDAS ==========
            group.MapGet("/search", async (
                string? cedula,
                string? nombre,
                string? apellido,
                string? q,
                ClinicaContext db) =>
            {
                var qry = db.Pacientes.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(cedula))
                    qry = qry.Where(p => p.PacienteCedula.Contains(cedula));

                if (!string.IsNullOrWhiteSpace(nombre))
                    qry = qry.Where(p => p.PacienteNombre.Contains(nombre));

                if (!string.IsNullOrWhiteSpace(apellido))
                    qry = qry.Where(p => p.PacienteApellido.Contains(apellido));

                if (!string.IsNullOrWhiteSpace(q))
                    qry = qry.Where(p =>
                        p.PacienteCedula.Contains(q) ||
                        p.PacienteNombre.Contains(q) ||
                        p.PacienteApellido.Contains(q) ||
                        p.PacienteEmail.Contains(q));

                return await qry.OrderBy(p => p.PacienteApellido)
                                .ThenBy(p => p.PacienteNombre)
                                .Take(100)
                                .ToListAsync();
            });

            return group;
        }
    }
}
