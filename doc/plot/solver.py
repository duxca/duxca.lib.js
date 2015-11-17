from sympy import pprint
from sympy import Symbol, Eq
from sympy.solvers import solve, simply
m=Symbol("m")
l=Symbol("l")
eqs = (
    Eq(Symbol("a"), m*Symbol("x")),
    Eq(Symbol("b"), Symbol("n")*Symbol("x")),
    Eq(Symbol("c"), l*Symbol("y")),
    Eq(Symbol("d"), Symbol("n")*Symbol("y")),
    Eq(Symbol("e"), l*Symbol("z")),
    Eq(Symbol("f"), m*Symbol("z"))
)
pprint(eqs)
pprint(simply(eqs, m/l))
# >> solve((Eq(x_12, m_2*d_12*v_1),Eq(x_13, m_3*d_13*v_1),Eq(x_21, m_1*d_12*v_2),Eq(x_23, m_3*d_23*v_2),Eq(x_31, m_1*d_13*v_3),Eq(x_32, m_2*d_23*v_3)))
# [{m_1: m_3*v_1*x_31/(v_3*x_13),
# m_2: m_3*v_2*x_32/(v_3*x_23),
# d_12: v_3*x_13*x_21/(m_3*v_1*v_2*x_31),
# d_13: x_13/(m_3*v_1),
# d_23: x_23/(m_3*v_2),
# x_12: x_13*x_21*x_32/(x_23*x_31)}]
