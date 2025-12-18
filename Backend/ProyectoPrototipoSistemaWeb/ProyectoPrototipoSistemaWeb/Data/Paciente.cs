using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ProyectoPrototipoSistemaWeb.Data;

[Table("Paciente")]
[Index("PacienteCedula", Name = "UQ_Paciente_Cedula", IsUnique = true)]
[Index("PacienteEmail", Name = "UQ_Paciente_Email", IsUnique = true)]
public partial class Paciente
{
    [Key]
    [Column("pacienteId")]
    public int PacienteId { get; set; }

    [Column("sexoId")]
    public int SexoId { get; set; }

    [Column("pacienteCedula")]
    [StringLength(20)]
    [Unicode(false)]
    public string PacienteCedula { get; set; } = null!;

    [Column("pacienteNombre")]
    [StringLength(30)]
    [Unicode(false)]
    public string PacienteNombre { get; set; } = null!;

    [Column("pacienteApellido")]
    [StringLength(30)]
    [Unicode(false)]
    public string PacienteApellido { get; set; } = null!;

    [Column("pacienteFechaNacimiento")]
    public DateOnly PacienteFechaNacimiento { get; set; }

    [Column("pacienteTelefono")]
    [StringLength(20)]
    [Unicode(false)]
    public string? PacienteTelefono { get; set; }

    [Column("pacienteEmail")]
    [StringLength(35)]
    [Unicode(false)]
    public string? PacienteEmail { get; set; }

    [Column("pacienteDireccion")]
    [StringLength(30)]
    [Unicode(false)]
    public string? PacienteDireccion { get; set; }

    [InverseProperty("Paciente")]
    public virtual ICollection<Citum> Cita { get; set; } = new List<Citum>();

    [ForeignKey("SexoId")]
    [InverseProperty("Pacientes")]
    public virtual CatalogoSexo Sexo { get; set; } = null!;


}
