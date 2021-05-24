import { useState, useReducer, Reducer, useEffect } from 'react'
import axios from 'axios'

export enum EApiVersions {
  v1 = 'v1',
  v2 = 'v2'
}

enum EActions {
  SUCCESS = 'success',
  ERROR = 'error'
}

enum EMethods {
  GET = 'get',
  POST = 'post'
}

interface IState {
  response: { data: Record<string, any> } | null
  error?: { type: number; message: string; data?: Record<string, any> }
}

type TAction =
  | { type: EActions.SUCCESS; payload: { data: Record<string, any> } }
  | {
      type: EActions.ERROR
      payload: { error: number; message: string; data?: Record<string, any> }
    }

const API_URL = {
  v1: process.env.REACT_API_URL + '/v1',
  v2: process.env.REACT_API_URL + '/v2'
}

interface IUseApiProps {
  version: EApiVersions
  route: string
  method: EMethods
}

function reducer(state: IState, action: TAction): IState {
  switch (action.type) {
    case EActions.SUCCESS: {
      return {
        ...state,
        response: {
          data: action.payload.data
        }
      }
    }

    case EActions.ERROR: {
      return {
        ...state,
        error: {
          type: action.payload.error,
          message: action.payload.message,
          data: action.payload.data
        }
      }
    }

    default:
      return state
  }
}

export default function useApi({ version, route, method }: IUseApiProps) {
  const client = axios.create({
    baseURL: API_URL[version]
  })
  const [{ response, error }, dispatch] = useReducer<Reducer<IState, TAction>>(
    reducer,
    {
      response: null,
      error: undefined
    }
  )

  useEffect(() => {}, [])
}
