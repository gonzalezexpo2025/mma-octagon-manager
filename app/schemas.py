"""Modelos Pydantic: validan los datos que recibe la API."""
import re
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

ESTILOS = ["Boxeo", "Muay Thai", "Kickboxing", "Jiu-Jitsu", "Lucha", "Judo", "Capoeira", "Karate", "Otro"]
METODOS = ["KO/TKO", "Sumisión", "Decisión unánime", "Decisión dividida", "Empate", "Sin resultado"]
ESTADOS_EVENTO = ["Programado", "Finalizado", "Cancelado"]


class CategoriaIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=40)
    limite_lb: float = Field(gt=0, le=500)
    limite_kg: float = Field(gt=0, le=250)


class PeleadorIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    apodo: Optional[str] = Field(default=None, max_length=40)
    pais: str = Field(min_length=2, max_length=60)
    fecha_nacimiento: date
    altura_cm: Optional[int] = Field(default=None, ge=120, le=250)
    alcance_cm: Optional[int] = Field(default=None, ge=120, le=260)
    estilo: str = Field(min_length=2, max_length=40)
    activo: bool = True
    categoria_id: int = Field(gt=0)

    @field_validator("fecha_nacimiento")
    @classmethod
    def mayor_de_edad(cls, v: date) -> date:
        hoy = date.today()
        edad = hoy.year - v.year - ((hoy.month, hoy.day) < (v.month, v.day))
        if edad < 18:
            raise ValueError("El peleador debe ser mayor de 18 años")
        if edad > 70:
            raise ValueError("Fecha de nacimiento no válida")
        return v


class EventoIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=100)
    fecha: date
    sede: str = Field(min_length=2, max_length=100)
    ciudad: str = Field(min_length=2, max_length=60)
    pais: str = Field(min_length=2, max_length=60)
    estado: str = "Programado"

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, v: str) -> str:
        if v not in ESTADOS_EVENTO:
            raise ValueError("Estado debe ser: " + ", ".join(ESTADOS_EVENTO))
        return v


class PeleaIn(BaseModel):
    evento_id: int = Field(gt=0)
    peleador_rojo_id: int = Field(gt=0)
    peleador_azul_id: int = Field(gt=0)
    categoria_id: int = Field(gt=0)
    rounds: int = 3
    es_titulo: bool = False
    ganador_id: Optional[int] = None
    metodo: Optional[str] = None
    round_final: Optional[int] = Field(default=None, ge=1, le=5)
    tiempo: Optional[str] = None

    @field_validator("rounds")
    @classmethod
    def rounds_validos(cls, v: int) -> int:
        if v not in (3, 5):
            raise ValueError("Los rounds deben ser 3 o 5")
        return v

    @field_validator("metodo")
    @classmethod
    def metodo_valido(cls, v):
        if v is not None and v not in METODOS:
            raise ValueError("Método no válido")
        return v

    @field_validator("tiempo")
    @classmethod
    def tiempo_valido(cls, v):
        if v is not None and not re.fullmatch(r"\d{1,2}:[0-5]\d", v):
            raise ValueError("El tiempo debe tener formato m:ss (ej. 3:41)")
        return v

    @model_validator(mode="after")
    def reglas_de_resultado(self):
        if self.peleador_rojo_id == self.peleador_azul_id:
            raise ValueError("Un peleador no puede pelear contra sí mismo")
        if self.ganador_id is not None and self.ganador_id not in (
            self.peleador_rojo_id, self.peleador_azul_id
        ):
            raise ValueError("El ganador debe ser uno de los dos peleadores")
        if self.round_final is not None and self.round_final > self.rounds:
            raise ValueError("El round final no puede superar los rounds pactados")
        if self.metodo in ("Empate", "Sin resultado") and self.ganador_id is not None:
            raise ValueError("Un empate o 'sin resultado' no puede tener ganador")
        if self.ganador_id is not None and self.metodo is None:
            raise ValueError("Indique el método de victoria")
        if self.metodo in ("KO/TKO", "Sumisión", "Decisión unánime", "Decisión dividida") \
                and self.ganador_id is None:
            raise ValueError("Indique el ganador de la pelea")
        return self
