using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

[Index("PacienteId", "CitaFecha", Name = "IX_Cita_Paciente_Fecha")]
public partial class Citum
{
    [Key]
    [Column("citaId")]
    public int CitaId { get; set; }

    [Column("pacienteId")]
    public int PacienteId { get; set; }

    [Column("citaFecha", TypeName = "datetime")]
    public DateTime CitaFecha { get; set; }

    [Column("citaMotivo")]
    [StringLength(200)]
    [Unicode(false)]
    public string? CitaMotivo { get; set; }

    [Column("citaModalidad")]
    [StringLength(20)]
    [Unicode(false)]
    public string CitaModalidad { get; set; } = null!;

    [InverseProperty("Cita")]
    public virtual ICollection<Informe> Informes { get; set; } = new List<Informe>();

    [ForeignKey("PacienteId")]
    [InverseProperty("Cita")]
    public virtual Paciente Paciente { get; set; } = null!;
}
